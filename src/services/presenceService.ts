import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from '../firebase/auth';
import { UserPresence, BoardPresence } from '../types';

class PresenceService {
  private presenceRef: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private unsubscribePresence: (() => void) | null = null;
  private currentBoardId: string | null = null;
  private isActive = true;

  // Heartbeat interval in milliseconds (30 seconds)
  private readonly HEARTBEAT_INTERVAL = 30000;

  // Consider user offline after 2 minutes of inactivity
  private readonly OFFLINE_THRESHOLD = 120000;

  constructor() {
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for beforeunload to clean up presence
    window.addEventListener('beforeunload', this.cleanup.bind(this));

    // Listen for user activity
    this.setupActivityListeners();
  }

  private setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const updateActivity = () => {
      this.isActive = true;
      this.updatePresence();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.isActive = false;
      this.updatePresence();
    } else {
      this.isActive = true;
      this.updatePresence();
    }
  }

  // Start tracking presence for a specific board
  async startPresence(boardId: string): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser || !boardId) return;

    // Clean up previous presence if switching boards
    if (this.currentBoardId && this.currentBoardId !== boardId) {
      await this.stopPresence();
    }

    this.currentBoardId = boardId;
    this.presenceRef = doc(db, 'boardPresence', boardId, 'users', currentUser.uid);

    // Set initial presence
    await this.updatePresence();

    // Start heartbeat
    this.startHeartbeat();
  }

  // Stop tracking presence
  async stopPresence(): Promise<void> {
    if (this.presenceRef) {
      try {
        await deleteDoc(this.presenceRef);
      } catch (error) {
        console.error('Error removing presence:', error);
      }
      this.presenceRef = null;
    }

    this.stopHeartbeat();
    this.currentBoardId = null;
  }

  // Update user presence data
  private async updatePresence(): Promise<void> {
    if (!this.presenceRef) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const presenceData: Omit<UserPresence, 'lastSeen'> & { lastSeen: any } = {
      userId: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      lastSeen: serverTimestamp(),
      isActive: this.isActive && !document.hidden,
      boardId: this.currentBoardId!
    };

    try {
      await setDoc(this.presenceRef, presenceData);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }

  // Start heartbeat to keep presence alive
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval

    this.heartbeatInterval = setInterval(() => {
      this.updatePresence();
    }, this.HEARTBEAT_INTERVAL);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Listen to presence changes for a board
  subscribeToPresence(
    boardId: string,
    callback: (presence: BoardPresence) => void
  ): () => void {
    const presenceCollectionRef = collection(db, 'boardPresence', boardId, 'users');

    return onSnapshot(presenceCollectionRef, (snapshot) => {
      const presence: BoardPresence = {};
      const now = Date.now();

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Handle both Firestore Timestamp and regular timestamp
        let lastSeenTime = 0;
        if (data.lastSeen) {
          if (typeof data.lastSeen.toMillis === 'function') {
            // Firestore Timestamp
            lastSeenTime = data.lastSeen.toMillis();
          } else if (typeof data.lastSeen === 'number') {
            // Regular timestamp
            lastSeenTime = data.lastSeen;
          } else if (typeof data.lastSeen === 'string') {
            // ISO string
            lastSeenTime = new Date(data.lastSeen).getTime();
          }
        }

        // Check if user is considered online (within threshold)
        const isOnline = (now - lastSeenTime) < this.OFFLINE_THRESHOLD;

        if (isOnline && data.userId) {
          presence[doc.id] = {
            userId: data.userId,
            email: data.email || '',
            displayName: data.displayName,
            photoURL: data.photoURL,
            lastSeen: new Date(lastSeenTime).toISOString(),
            isActive: data.isActive && isOnline,
            boardId: data.boardId || boardId
          } as UserPresence;
        }
      });

      callback(presence);
    }, (error) => {
      console.error('Error listening to presence:', error);
      // Call callback with empty presence on error to prevent UI issues
      callback({});
    });
  }

  // Cleanup method
  private async cleanup(): Promise<void> {
    await this.stopPresence();
    this.stopHeartbeat();

    if (this.unsubscribePresence) {
      this.unsubscribePresence();
      this.unsubscribePresence = null;
    }
  }

  // Get current board ID
  getCurrentBoardId(): string | null {
    return this.currentBoardId;
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
