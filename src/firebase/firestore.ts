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
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './config';
import { Board, List, Card, FirestoreTimestamp, User, BoardMember, BoardPermission } from '../types';
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

    // Create lists with proper metadata and sanitize data
    const listsWithMetadata = lists.map(list => {
      // Ensure cards array exists and sanitize each card
      const sanitizedCards = Array.isArray(list.cards) ? list.cards.map(card => {
        // Sanitize labels
        const sanitizedLabels = Array.isArray(card.labels) ? card.labels.map(label => ({
          id: label.id || crypto.randomUUID(),
          text: label.text || '',
          color: label.color || 'blue'
        })) : [];

        // Sanitize comments
        const sanitizedComments = Array.isArray(card.comments) ? card.comments.map(comment => ({
          id: comment.id || crypto.randomUUID(),
          text: comment.text || '',
          createdAt: comment.createdAt || timestamp,
          author: comment.author || 'Unknown',
          authorId: comment.authorId || currentUser.uid
        })) : [];

        // Sanitize attachments
        const sanitizedAttachments = Array.isArray(card.attachments) ? card.attachments.map(attachment => ({
          id: attachment.id || crypto.randomUUID(),
          name: attachment.name || 'Unnamed attachment',
          url: attachment.url || '',
          createdAt: attachment.createdAt || timestamp,
          uploadedBy: attachment.uploadedBy || currentUser.uid
        })) : [];

        // Sanitize checklists
        const sanitizedChecklists = Array.isArray(card.checklists) ? card.checklists.map(checklist => {
          // Sanitize checklist items
          const sanitizedItems = Array.isArray(checklist.items) ? checklist.items.map(item => ({
            id: item.id || crypto.randomUUID(),
            name: item.name || '',
            state: item.state || 'incomplete',
            pos: typeof item.pos === 'number' ? item.pos : 0
          })) : [];

          return {
            id: checklist.id || crypto.randomUUID(),
            title: checklist.title || '',
            items: sanitizedItems,
            pos: typeof checklist.pos === 'number' ? checklist.pos : 0
          };
        }) : [];

        return {
          id: card.id || crypto.randomUUID(),
          content: card.content || 'Untitled Card',
          description: card.description || '',
          labels: sanitizedLabels,
          dueDate: card.dueDate || undefined,
          comments: sanitizedComments,
          attachments: sanitizedAttachments,
          checklists: sanitizedChecklists,
          createdAt: card.createdAt || timestamp,
          createdBy: card.createdBy || currentUser.uid,
          assignedTo: Array.isArray(card.assignedTo) ? card.assignedTo : []
        };
      }) : [];

      return {
        id: list.id || crypto.randomUUID(),
        title: list.title || 'Untitled List',
        cards: sanitizedCards,
        createdAt: list.createdAt || timestamp,
        createdBy: list.createdBy || currentUser.uid
      };
    });

    // Create initial board member for the creator
    const creatorMember: BoardMember = {
      userId: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      permission: 'owner',
      joinedAt: timestamp
    };

    const newBoard: Board = {
      ...board,
      id: boardRef.id,
      title: board.title || 'Untitled Board',
      backgroundColor: board.backgroundColor || '#0079BF',
      backgroundImage: board.backgroundImage, // Include the background image
      createdAt: timestamp,
      createdBy: currentUser.uid,
      members: [currentUser.uid],
      boardMembers: [creatorMember],
      lists: listsWithMetadata
    };

    // Log the background information for debugging
    console.log('Creating board with background:', {
      backgroundColor: board.backgroundColor,
      backgroundImage: board.backgroundImage
    });

    // Helper function to recursively remove undefined values and handle circular references
    const removeUndefined = (obj: any, seen = new WeakMap()): any => {
      // Handle null or undefined
      if (obj === null || obj === undefined) {
        return null;
      }

      // Handle primitive types
      if (typeof obj !== 'object') {
        return obj;
      }

      // Handle circular references
      if (seen.has(obj)) {
        console.warn('Circular reference detected and removed');
        return null;
      }

      // Add this object to seen objects
      seen.set(obj, true);

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item, seen));
      }

      // Handle objects
      const result: any = {};
      for (const key in obj) {
        // Skip __proto__ properties
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        // Skip functions and symbols which aren't valid in Firestore
        if (typeof obj[key] === 'function' || typeof obj[key] === 'symbol') continue;

        const value = removeUndefined(obj[key], seen);
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return result;
    };

    // Prepare data for Firestore by removing all undefined values
    const sanitizedBoard = removeUndefined(newBoard);

    // Create a clean object for Firestore
    const firestoreData: Record<string, any> = {};

    // Manually copy properties to ensure no undefined values
    Object.entries(sanitizedBoard).forEach(([key, value]) => {
      if (value !== undefined) {
        firestoreData[key] = value;
      }
    });

    // Add server timestamp
    firestoreData.createdAt = serverTimestamp();

    // Log the data we're about to save
    console.log('Creating board in Firestore with ID:', boardRef.id);

    try {
      // Set the document in Firestore
      await setDoc(boardRef, firestoreData);
      console.log('Board created successfully with ID:', boardRef.id);
    } catch (error) {
      console.error('Error in setDoc operation:', error);

      // Try to identify the problematic field
      if (error instanceof Error && error.message.includes('Unsupported field value: undefined')) {
        console.error('Attempting to find undefined values in the data:');
        const findUndefined = (obj: any, path = '') => {
          if (obj === undefined) {
            console.error(`Found undefined at path: ${path}`);
            return;
          }

          if (obj === null || typeof obj !== 'object') return;

          Object.entries(obj).forEach(([key, value]) => {
            if (value === undefined) {
              console.error(`Found undefined at path: ${path ? path + '.' + key : key}`);
            } else if (typeof value === 'object' && value !== null) {
              findUndefined(value, path ? path + '.' + key : key);
            }
          });
        };

        findUndefined(firestoreData);
        throw error; // Re-throw after logging
      }
      throw error;
    }

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

    // Log the background information for debugging
    console.log('Updating board with background:', {
      backgroundColor: boardData.backgroundColor,
      backgroundImage: boardData.backgroundImage
    });

    // Helper function to recursively remove undefined values and handle circular references
    const removeUndefined = (obj: any, seen = new WeakMap()): any => {
      // Handle null or undefined
      if (obj === null || obj === undefined) {
        return null;
      }

      // Handle primitive types
      if (typeof obj !== 'object') {
        return obj;
      }

      // Handle circular references
      if (seen.has(obj)) {
        console.warn('Circular reference detected and removed');
        return null;
      }

      // Add this object to seen objects
      seen.set(obj, true);

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item, seen));
      }

      // Handle objects
      const result: any = {};
      for (const key in obj) {
        // Skip __proto__ properties
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        // Skip functions and symbols which aren't valid in Firestore
        if (typeof obj[key] === 'function' || typeof obj[key] === 'symbol') continue;

        const value = removeUndefined(obj[key], seen);
        if (value !== undefined) {
          result[key] = value;
        }
      }
      return result;
    };

    // Sanitize the board data to remove undefined values
    const sanitizedBoardData = removeUndefined(boardData);

    // Create a clean object for Firestore
    const firestoreData: Record<string, any> = {};

    // Manually copy properties to ensure no undefined values
    Object.entries(sanitizedBoardData).forEach(([key, value]) => {
      if (value !== undefined) {
        firestoreData[key] = value;
      }
    });

    // Update the document in Firestore
    await updateDoc(boardRef, firestoreData);
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

// ===== USER MANAGEMENT AND BOARD SHARING FUNCTIONS =====

// Collections
const usersCollection = collection(db, 'users');

// Search users by email
export const searchUsersByEmail = async (email: string): Promise<User[]> => {
  try {
    if (!email.trim()) return [];

    const q = query(usersCollection, where('email', '>=', email), where('email', '<=', email + '\uf8ff'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data() as User);
  } catch (error) {
    console.error('Error searching users by email:', error);
    return [];
  }
};

// Get user profile by ID
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Get multiple user profiles by IDs
export const getUserProfiles = async (userIds: string[]): Promise<User[]> => {
  try {
    if (userIds.length === 0) return [];

    const userProfiles: User[] = [];

    // Firestore has a limit of 10 items for 'in' queries, so we batch them
    const batches = [];
    for (let i = 0; i < userIds.length; i += 10) {
      batches.push(userIds.slice(i, i + 10));
    }

    for (const batch of batches) {
      const q = query(usersCollection, where('uid', 'in', batch));
      const querySnapshot = await getDocs(q);

      querySnapshot.docs.forEach(doc => {
        userProfiles.push(doc.data() as User);
      });
    }

    return userProfiles;
  } catch (error) {
    console.error('Error getting user profiles:', error);
    return [];
  }
};

// Add member to board
export const addMemberToBoard = async (
  boardId: string,
  userEmail: string,
  permission: BoardPermission = 'member'
): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to add members');

    // First, find the user by email
    const userQuery = query(usersCollection, where('email', '==', userEmail));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error('User not found with this email address');
    }

    const userData = userSnapshot.docs[0].data() as User;
    const userId = userData.uid;

    // Get the board to check permissions and current members
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    // Check if current user has permission to add members
    if (board.createdBy !== currentUser.uid && !board.members.includes(currentUser.uid)) {
      throw new Error('You do not have permission to add members to this board');
    }

    // Check if user is already a member
    if (board.members.includes(userId)) {
      throw new Error('User is already a member of this board');
    }

    // Add user to members array
    await updateDoc(boardRef, {
      members: arrayUnion(userId)
    });

    // Create detailed member record if boardMembers array exists
    const newMember: BoardMember = {
      userId,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      permission,
      joinedAt: new Date().toISOString()
    };

    // Update boardMembers array if it exists
    if (board.boardMembers) {
      await updateDoc(boardRef, {
        boardMembers: arrayUnion(newMember)
      });
    }

  } catch (error) {
    console.error('Error adding member to board:', error);
    throw error;
  }
};

// Remove member from board
export const removeMemberFromBoard = async (boardId: string, userId: string): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to remove members');

    // Get the board to check permissions
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    // Check if current user has permission to remove members
    if (board.createdBy !== currentUser.uid && currentUser.uid !== userId) {
      throw new Error('You do not have permission to remove members from this board');
    }

    // Cannot remove the board creator
    if (userId === board.createdBy) {
      throw new Error('Cannot remove the board creator');
    }

    // Remove user from members array
    await updateDoc(boardRef, {
      members: arrayRemove(userId)
    });

    // Remove from boardMembers array if it exists
    if (board.boardMembers) {
      const memberToRemove = board.boardMembers.find(member => member.userId === userId);
      if (memberToRemove) {
        await updateDoc(boardRef, {
          boardMembers: arrayRemove(memberToRemove)
        });
      }
    }

  } catch (error) {
    console.error('Error removing member from board:', error);
    throw error;
  }
};

// Update member permission
export const updateMemberPermission = async (
  boardId: string,
  userId: string,
  newPermission: BoardPermission
): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to update permissions');

    // Get the board to check permissions
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    // Check if current user has permission to update permissions (only owner can do this)
    if (board.createdBy !== currentUser.uid) {
      throw new Error('Only the board owner can update member permissions');
    }

    // Cannot change owner permission
    if (userId === board.createdBy) {
      throw new Error('Cannot change the board owner\'s permission');
    }

    // Update boardMembers array if it exists
    if (board.boardMembers) {
      const updatedMembers = board.boardMembers.map(member =>
        member.userId === userId
          ? { ...member, permission: newPermission }
          : member
      );

      await updateDoc(boardRef, {
        boardMembers: updatedMembers
      });
    }

  } catch (error) {
    console.error('Error updating member permission:', error);
    throw error;
  }
};

// Get board members with their details
export const getBoardMembers = async (boardId: string): Promise<BoardMember[]> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    // If boardMembers exists, return it
    if (board.boardMembers && board.boardMembers.length > 0) {
      return board.boardMembers;
    }

    // Otherwise, build it from the members array
    if (board.members && board.members.length > 0) {
      const userProfiles = await getUserProfiles(board.members);

      return userProfiles.map(user => ({
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        permission: user.uid === board.createdBy ? 'owner' as BoardPermission : 'member' as BoardPermission,
        joinedAt: user.uid === board.createdBy ? board.createdAt : new Date().toISOString()
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting board members:', error);
    return [];
  }
};

// Migration function to update boards with missing boardMembers data
export const migrateBoardMembers = async (boardId: string): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    // Only migrate if boardMembers is missing but members array exists
    if ((!board.boardMembers || board.boardMembers.length === 0) && board.members && board.members.length > 0) {
      console.log(`Migrating board members for board: ${boardId}`);

      const userProfiles = await getUserProfiles(board.members);
      const boardMembers: BoardMember[] = userProfiles.map(user => ({
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        permission: user.uid === board.createdBy ? 'owner' as BoardPermission : 'member' as BoardPermission,
        joinedAt: user.uid === board.createdBy ? board.createdAt : new Date().toISOString()
      }));

      // Update the board with the new boardMembers data
      await updateDoc(boardRef, { boardMembers });
      console.log(`Successfully migrated ${boardMembers.length} board members for board: ${boardId}`);
    }
  } catch (error) {
    console.error('Error migrating board members:', error);
  }
};

// Migration function to update sticky notes with missing createdBy field
export const migrateStickyNotes = async (boardId: string): Promise<void> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) throw new Error('Board not found');

    const board = boardDoc.data() as Board;

    if (board.stickyNotes && board.stickyNotes.length > 0) {
      let hasLegacyNotes = false;
      const updatedStickyNotes = board.stickyNotes.map(note => {
        if (!note.createdBy) {
          hasLegacyNotes = true;
          // For legacy notes, we can't determine the creator, so we'll leave it empty
          // The UI will handle this gracefully by showing a "Legacy Note" indicator
          return {
            ...note,
            createdBy: '', // Empty string to indicate legacy note
            createdAt: note.createdAt || new Date().toISOString()
          };
        }
        return note;
      });

      if (hasLegacyNotes) {
        console.log(`Migrating sticky notes for board: ${boardId}`);
        await updateDoc(boardRef, { stickyNotes: updatedStickyNotes });
        console.log(`Successfully migrated sticky notes for board: ${boardId}`);
      }
    }
  } catch (error) {
    console.error('Error migrating sticky notes:', error);
  }
};

// Check if user has permission to perform action on board
export const checkBoardPermission = async (
  boardId: string,
  userId: string,
  requiredPermission: 'read' | 'write' | 'admin' | 'owner'
): Promise<boolean> => {
  try {
    const boardRef = doc(boardsCollection, boardId);
    const boardDoc = await getDoc(boardRef);

    if (!boardDoc.exists()) return false;

    const board = boardDoc.data() as Board;

    // Check if user is a member
    if (!board.members.includes(userId)) return false;

    // Owner has all permissions
    if (board.createdBy === userId) return true;

    // Get user's permission level
    let userPermission: BoardPermission = 'member';
    if (board.boardMembers) {
      const member = board.boardMembers.find(m => m.userId === userId);
      if (member) {
        userPermission = member.permission;
      }
    }

    // Check permission hierarchy
    const permissionLevels = {
      'viewer': 1,
      'member': 2,
      'admin': 3,
      'owner': 4
    };

    const requiredLevels = {
      'read': 1,
      'write': 2,
      'admin': 3,
      'owner': 4
    };

    return permissionLevels[userPermission] >= requiredLevels[requiredPermission];
  } catch (error) {
    console.error('Error checking board permission:', error);
    return false;
  }
};
