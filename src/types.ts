export type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue';
export type StickyNoteColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Label {
  id: string;
  text: string;
  color: LabelColor;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: string;
  authorId: string;
  authorPhotoURL?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  uploadedBy: string;
}

export interface CheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
}

export interface Checklist {
  id: string;
  title: string;
  items: CheckItem[];
  pos: number;
}

export interface Card {
  id: string;
  content: string;
  description?: string;
  labels: Label[];
  dueDate?: string;
  comments: Comment[];
  attachments: Attachment[];
  checklists: Checklist[];
  createdAt: string;
  createdBy: string;
  assignedTo?: string[];
}

export interface List {
  id: string;
  title: string;
  cards: Card[];
  createdAt?: string;
  createdBy?: string;
}

export type BoardPermission = 'owner' | 'admin' | 'member' | 'viewer';

export interface BoardMember {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  permission: BoardPermission;
  joinedAt: string;
}

export interface BoardInvitation {
  id: string;
  boardId: string;
  boardTitle: string;
  inviterEmail: string;
  inviterName?: string;
  inviteeEmail: string;
  permission: BoardPermission;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
  backgroundColor?: string;
  backgroundImage?: string;
  createdAt: string;
  createdBy: string;
  members: string[]; // Array of user IDs who have access to this board (for backward compatibility)
  boardMembers?: BoardMember[]; // Detailed member information with permissions
  stickyNotes?: StickyNote[]; // Sticky notes that can be placed anywhere on the board
}

export interface StickyNote {
  id: string;
  content: string;
  color: StickyNoteColor;
  position: {
    x: number;
    y: number;
  };
  rotation?: number;
  createdAt: string;
  createdBy: string;
}

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface UserPresence {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  lastSeen: string;
  isActive: boolean;
  boardId: string;
}

export interface BoardPresence {
  [userId: string]: UserPresence;
}

