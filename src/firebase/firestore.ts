import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Board, List, Card, FirestoreTimestamp } from '../types';
import { getCurrentUser } from './auth';

// Convert Firestore timestamp to string
export const timestampToString = (timestamp: FirestoreTimestamp): string => {
  return new Date(timestamp.seconds * 1000).toISOString();
};

// Convert string to Firestore timestamp
export const stringToTimestamp = (dateString: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateString));
};

// Boards Collection
const boardsCollection = collection(db, 'boards');

// Create a new board
export const createBoard = async (board: Omit<Board, 'id' | 'createdAt' | 'createdBy' | 'members'>): Promise<Board> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to create a board');

    const boardRef = doc(boardsCollection);
    const timestamp = new Date().toISOString();

    // Ensure lists array exists and has proper structure
    const lists = Array.isArray(board.lists) ? board.lists : [];

    // Create lists with proper metadata
    const listsWithMetadata = lists.map(list => ({
      ...list,
      id: list.id || crypto.randomUUID(),
      createdAt: timestamp,
      createdBy: currentUser.uid,
      cards: Array.isArray(list.cards) ? list.cards : []
    }));

    const newBoard: Board = {
      ...board,
      id: boardRef.id,
      createdAt: timestamp,
      createdBy: currentUser.uid,
      members: [currentUser.uid],
      lists: listsWithMetadata
    };

    // Prepare data for Firestore
    const firestoreData = {
      ...newBoard,
      createdAt: serverTimestamp()
    };

    console.log('Creating board in Firestore:', firestoreData);

    // Set the document in Firestore
    await setDoc(boardRef, firestoreData);
    console.log('Board created successfully with ID:', boardRef.id);

    // Return the board with the client-side timestamp for immediate use
    return newBoard;
  } catch (error) {
    console.error('Error creating board:', error);
    throw error;
  }
};

// Get all boards for the current user
export const getUserBoards = async (): Promise<Board[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to get boards');

    const q = query(boardsCollection, where('members', 'array-contains', currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No boards found for user');
      return [];
    }

    return querySnapshot.docs.map(doc => {
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
  } catch (error) {
    console.error('Error getting user boards:', error);
    return []; // Return empty array instead of throwing to prevent app crashes
  }
};

// Get a board by ID
export const getBoardById = async (boardId: string): Promise<Board | null> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) return null;

    const data = boardDoc.data();

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
      id: boardDoc.id,
      createdAt,
      lists
    } as Board;
  } catch (error) {
    console.error('Error getting board by ID:', error);
    return null; // Return null instead of throwing to prevent app crashes
  }
};

// Update a board
export const updateBoard = async (boardId: string, boardData: Partial<Board>): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    await updateDoc(boardRef, boardData);
  } catch (error) {
    console.error('Error updating board:', error);
    throw error;
  }
};

// Delete a board
export const deleteBoard = async (boardId: string): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    await deleteDoc(boardRef);
  } catch (error) {
    console.error('Error deleting board:', error);
    throw error;
  }
};

// Add a list to a board
export const addListToBoard = async (boardId: string, list: Omit<List, 'id' | 'createdAt' | 'createdBy'>): Promise<List> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to add a list');

    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const timestamp = new Date().toISOString();

    const newList: List = {
      ...list,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      createdBy: currentUser.uid
    };

    // Update the lists array in the board document
    const updatedLists = [...board.lists, newList];
    await updateDoc(boardRef, { lists: updatedLists });

    return newList;
  } catch (error) {
    console.error('Error adding list to board:', error);
    throw error;
  }
};

// Update a list in a board
export const updateList = async (boardId: string, listId: string, listData: Partial<List>): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const listIndex = board.lists.findIndex(list => list.id === listId);

    if (listIndex === -1) throw new Error('List not found');

    const updatedLists = [...board.lists];
    updatedLists[listIndex] = { ...updatedLists[listIndex], ...listData };

    await updateDoc(boardRef, { lists: updatedLists });
  } catch (error) {
    console.error('Error updating list:', error);
    throw error;
  }
};

// Delete a list from a board
export const deleteList = async (boardId: string, listId: string): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const updatedLists = board.lists.filter(list => list.id !== listId);

    await updateDoc(boardRef, { lists: updatedLists });
  } catch (error) {
    console.error('Error deleting list:', error);
    throw error;
  }
};

// Add a card to a list
export const addCardToList = async (boardId: string, listId: string, card: Omit<Card, 'id' | 'createdAt' | 'createdBy'>): Promise<Card> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to add a card');

    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const listIndex = board.lists.findIndex(list => list.id === listId);

    if (listIndex === -1) throw new Error('List not found');

    const newCard: Card = {
      ...card,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid
    };

    const updatedLists = [...board.lists];
    updatedLists[listIndex].cards = [...updatedLists[listIndex].cards, newCard];

    await updateDoc(boardRef, { lists: updatedLists });

    return newCard;
  } catch (error) {
    console.error('Error adding card to list:', error);
    throw error;
  }
};

// Update a card in a list
export const updateCard = async (boardId: string, listId: string, cardId: string, cardData: Partial<Card>): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const listIndex = board.lists.findIndex(list => list.id === listId);

    if (listIndex === -1) throw new Error('List not found');

    const cardIndex = board.lists[listIndex].cards.findIndex(card => card.id === cardId);

    if (cardIndex === -1) throw new Error('Card not found');

    const updatedLists = [...board.lists];
    updatedLists[listIndex].cards[cardIndex] = {
      ...updatedLists[listIndex].cards[cardIndex],
      ...cardData
    };

    await updateDoc(boardRef, { lists: updatedLists });
  } catch (error) {
    console.error('Error updating card:', error);
    throw error;
  }
};

// Delete a card from a list
export const deleteCard = async (boardId: string, listId: string, cardId: string): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const listIndex = board.lists.findIndex(list => list.id === listId);

    if (listIndex === -1) throw new Error('List not found');

    const updatedLists = [...board.lists];
    updatedLists[listIndex].cards = updatedLists[listIndex].cards.filter(card => card.id !== cardId);

    await updateDoc(boardRef, { lists: updatedLists });
  } catch (error) {
    console.error('Error deleting card:', error);
    throw error;
  }
};

// Move a card between lists
export const moveCard = async (
  boardId: string,
  sourceListId: string,
  destinationListId: string,
  sourceIndex: number,
  destinationIndex: number
): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;
    const sourceListIndex = board.lists.findIndex(list => list.id === sourceListId);
    const destListIndex = board.lists.findIndex(list => list.id === destinationListId);

    if (sourceListIndex === -1 || destListIndex === -1) throw new Error('List not found');

    const updatedLists = [...board.lists];
    const [movedCard] = updatedLists[sourceListIndex].cards.splice(sourceIndex, 1);
    updatedLists[destListIndex].cards.splice(destinationIndex, 0, movedCard);

    await updateDoc(boardRef, { lists: updatedLists });
  } catch (error) {
    console.error('Error moving card:', error);
    throw error;
  }
};
