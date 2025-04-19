import { Board, List, Card, Label } from '../types';

// Trello API types
interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  prefs: {
    backgroundColor?: string;
    backgroundImage?: string;
  };
}

interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
  pos: number;
  closed: boolean;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  pos: number;
  due: string | null;
  dueComplete: boolean;
  labels: TrelloLabel[];
  idMembers: string[];
}

interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

interface TrelloComment {
  id: string;
  data: {
    text: string;
  };
  date: string;
  memberCreator: {
    fullName: string;
    username: string;
  };
}

interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  date: string;
}

// Fetch boards from Trello
export const fetchTrelloBoards = async (apiKey: string, token: string): Promise<TrelloBoard[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${token}&fields=name,desc,url,prefs`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello boards:', error);
    throw error;
  }
};

// Fetch lists for a board
export const fetchTrelloLists = async (
  boardId: string,
  apiKey: string,
  token: string
): Promise<TrelloList[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}&fields=name,pos,closed`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch lists: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello lists:', error);
    throw error;
  }
};

// Fetch cards for a board
export const fetchTrelloCards = async (
  boardId: string,
  apiKey: string,
  token: string
): Promise<TrelloCard[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${token}&fields=name,desc,idList,due,dueComplete,labels,idMembers`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello cards:', error);
    throw error;
  }
};

// Fetch comments for a card
export const fetchTrelloComments = async (
  cardId: string,
  apiKey: string,
  token: string
): Promise<TrelloComment[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${cardId}/actions?key=${apiKey}&token=${token}&filter=commentCard`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch comments for card ${cardId}: ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello comments:', error);
    return []; // Return empty array instead of throwing
  }
};

// Fetch attachments for a card
export const fetchTrelloAttachments = async (
  cardId: string,
  apiKey: string,
  token: string
): Promise<TrelloAttachment[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${cardId}/attachments?key=${apiKey}&token=${token}&fields=name,url,date`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch attachments for card ${cardId}: ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello attachments:', error);
    return []; // Return empty array instead of throwing
  }
};

// Convert Trello color to TrelloX color
const convertTrelloColor = (trelloColor: string): string => {
  const colorMap: Record<string, string> = {
    'green': 'green',
    'yellow': 'yellow',
    'orange': 'orange',
    'red': 'red',
    'purple': 'purple',
    'blue': 'blue',
    'sky': 'blue',
    'lime': 'green',
    'pink': 'purple',
    'black': 'purple',
  };

  return colorMap[trelloColor] || 'blue';
};

// Convert Trello board to TrelloX board
export const convertTrelloBoard = async (
  trelloBoard: TrelloBoard,
  trelloLists: TrelloList[],
  trelloCards: TrelloCard[],
  apiKey: string,
  token: string,
  userId: string
): Promise<Board> => {
  // Sort lists by position
  const sortedLists = [...trelloLists].sort((a, b) => a.pos - b.pos);

  // Process each list
  const lists: List[] = await Promise.all(
    sortedLists.map(async (trelloList) => {
      // Get cards for this list
      const listCards = trelloCards.filter(card => card.idList === trelloList.id);

      // Sort cards by position
      const sortedCards = [...listCards].sort((a, b) => a.pos - b.pos);

      // Process each card
      const cards: Card[] = await Promise.all(
        sortedCards.map(async (trelloCard) => {
          try {
            // Fetch comments for this card
            const trelloComments = await fetchTrelloComments(trelloCard.id, apiKey, token);

            // Fetch attachments for this card
            const trelloAttachments = await fetchTrelloAttachments(trelloCard.id, apiKey, token);

            // Convert Trello labels to TrelloX labels
            const labels = Array.isArray(trelloCard.labels) ? trelloCard.labels.map(label => ({
              id: label.id,
              text: label.name,
              color: convertTrelloColor(label.color) as any
            })) : [];

            // Convert Trello comments to TrelloX comments
            const comments = Array.isArray(trelloComments) ? trelloComments.map(comment => {
              try {
                return {
                  id: comment.id,
                  text: comment.data?.text || '',
                  createdAt: comment.date || new Date().toISOString(),
                  author: comment.memberCreator?.fullName || comment.memberCreator?.username || 'Unknown',
                  authorId: comment.memberCreator?.username || 'unknown'
                };
              } catch (err) {
                console.warn('Error processing comment:', err);
                return null;
              }
            }).filter(Boolean) : [];

            // Convert Trello attachments to TrelloX attachments
            const attachments = Array.isArray(trelloAttachments) ? trelloAttachments.map(attachment => {
              try {
                return {
                  id: attachment.id,
                  name: attachment.name || 'Unnamed attachment',
                  url: attachment.url || '',
                  createdAt: attachment.date || new Date().toISOString(),
                  uploadedBy: userId
                };
              } catch (err) {
                console.warn('Error processing attachment:', err);
                return null;
              }
            }).filter(Boolean) : [];

            return {
              id: trelloCard.id,
              content: trelloCard.name,
              description: trelloCard.desc || '',
              labels,
              dueDate: trelloCard.due,
              comments,
              attachments,
              createdAt: new Date().toISOString(),
              createdBy: userId,
              assignedTo: trelloCard.idMembers || []
            };
          } catch (error) {
            console.error('Error processing card:', trelloCard.id, error);
            // Return a minimal valid card to prevent the entire import from failing
            return {
              id: trelloCard.id,
              content: trelloCard.name || 'Unnamed Card',
              description: '',
              labels: [],
              comments: [],
              attachments: [],
              createdAt: new Date().toISOString(),
              createdBy: userId,
              assignedTo: []
            };
          }
        })
      );

      return {
        id: trelloList.id,
        title: trelloList.name,
        cards,
        createdAt: new Date().toISOString(),
        createdBy: userId
      };
    })
  );

  // Create the TrelloX board
  const board: Board = {
    id: trelloBoard.id,
    title: trelloBoard.name,
    lists,
    backgroundColor: trelloBoard.prefs.backgroundColor || '#0079BF',
    createdAt: new Date().toISOString(),
    createdBy: userId,
    members: [userId]
  };

  return board;
};
