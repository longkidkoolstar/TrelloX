import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser } from '../firebase/auth';
import { Board } from '../types';
import { timestampToString } from '../firebase/firestore';

class RealtimeBoardService {
  private boardListeners: Map<string, Unsubscribe> = new Map();
  private userBoardsListener: Unsubscribe | null = null;

  // Subscribe to real-time updates for a specific board
  subscribeToBoardUpdates(
    boardId: string,
    callback: (board: Board | null) => void
  ): () => void {
    // Clean up existing listener for this board
    this.unsubscribeFromBoard(boardId);

    const boardRef = doc(db, 'boards', boardId);
    
    const unsubscribe = onSnapshot(boardRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // Convert Firestore timestamp to string
        const createdAt = data.createdAt ?
          (typeof data.createdAt === 'object' && 'seconds' in data.createdAt) ?
            timestampToString(data.createdAt) :
            data.createdAt :
          new Date().toISOString();

        // Process lists to ensure they have proper structure
        const lists = Array.isArray(data.lists) ? data.lists.map(list => ({
          ...list,
          // Ensure cards array exists and has proper structure
          cards: Array.isArray(list.cards) ? list.cards.map((card: { labels: any; comments: any; attachments: any; checklists: any; assignedTo: any; }) => ({
            ...card,
            // Ensure all required card properties exist
            labels: Array.isArray(card.labels) ? card.labels : [],
            comments: Array.isArray(card.comments) ? card.comments : [],
            attachments: Array.isArray(card.attachments) ? card.attachments : [],
            checklists: Array.isArray(card.checklists) ? card.checklists : [],
            assignedTo: Array.isArray(card.assignedTo) ? card.assignedTo : []
          })) : []
        })) : [];

        // Process sticky notes
        const stickyNotes = Array.isArray(data.stickyNotes) ? data.stickyNotes : [];

        const board: Board = {
          ...data,
          id: doc.id,
          createdAt,
          lists,
          stickyNotes
        } as Board;

        callback(board);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to board updates:', error);
      callback(null);
    });

    // Store the unsubscribe function
    this.boardListeners.set(boardId, unsubscribe);

    // Return cleanup function
    return () => this.unsubscribeFromBoard(boardId);
  }

  // Subscribe to real-time updates for user's boards list
  subscribeToUserBoards(
    callback: (boards: Board[]) => void
  ): () => void {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    // Clean up existing listener
    if (this.userBoardsListener) {
      this.userBoardsListener();
      this.userBoardsListener = null;
    }

    const boardsCollection = collection(db, 'boards');
    const q = query(boardsCollection, where('members', 'array-contains', currentUser.uid));
    
    this.userBoardsListener = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        callback([]);
        return;
      }

      const boards = querySnapshot.docs.map(doc => {
        const data = doc.data();

        // Convert Firestore timestamp to string
        const createdAt = data.createdAt ?
          (typeof data.createdAt === 'object' && 'seconds' in data.createdAt) ?
            timestampToString(data.createdAt) :
            data.createdAt :
          new Date().toISOString();

        // Process lists to ensure they have proper structure
        const lists = Array.isArray(data.lists) ? data.lists.map(list => ({
          ...list,
          // Ensure cards array exists
          cards: Array.isArray(list.cards) ? list.cards : []
        })) : [];

        return {
          ...data,
          id: doc.id,
          createdAt,
          lists
        } as Board;
      });

      callback(boards);
    }, (error) => {
      console.error('Error listening to user boards:', error);
      callback([]);
    });

    // Return cleanup function
    return () => {
      if (this.userBoardsListener) {
        this.userBoardsListener();
        this.userBoardsListener = null;
      }
    };
  }

  // Unsubscribe from a specific board
  private unsubscribeFromBoard(boardId: string): void {
    const unsubscribe = this.boardListeners.get(boardId);
    if (unsubscribe) {
      unsubscribe();
      this.boardListeners.delete(boardId);
    }
  }

  // Unsubscribe from all boards
  unsubscribeFromAllBoards(): void {
    this.boardListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.boardListeners.clear();

    if (this.userBoardsListener) {
      this.userBoardsListener();
      this.userBoardsListener = null;
    }
  }

  // Get current active listeners count (for debugging)
  getActiveListenersCount(): number {
    return this.boardListeners.size + (this.userBoardsListener ? 1 : 0);
  }
}

// Export singleton instance
export const realtimeBoardService = new RealtimeBoardService();
