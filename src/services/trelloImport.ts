import { Board, List, Card, Attachment } from '../types';

// Trello API types
interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  prefs: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundImageScaled?: Array<{
      width: number;
      height: number;
      url: string;
    }>;
    backgroundTile?: boolean;
    backgroundBrightness?: string;
    backgroundBottomColor?: string;
    backgroundTopColor?: string;
    // For Unsplash backgrounds
    backgroundUrl?: string;
    backgroundFullUrl?: string;
    backgroundLargeUrl?: string;
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

interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
}

// Fetch boards from Trello
export const fetchTrelloBoards = async (apiKey: string, token: string): Promise<TrelloBoard[]> => {
  try {
    // First get the list of boards with basic info
    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${token}&fields=name,desc,url,prefs`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }

    const boards = await response.json() as TrelloBoard[];
    console.log(`Fetched ${boards.length} boards from Trello`);

    // Process each board to get full background information
    const boardsWithDetails = await Promise.all(
      boards.map(async (board: TrelloBoard) => {
        try {
          // Fetch detailed board information with expanded prefs
          const detailResponse = await fetch(
            `https://api.trello.com/1/boards/${board.id}?key=${apiKey}&token=${token}&fields=name,desc,url,prefs&board_fields=prefs`
          );

          if (detailResponse.ok) {
            const detailedBoard = await detailResponse.json();
            console.log(`Fetched detailed info for board: ${detailedBoard.name}`);

            // If the board has a background, log it for debugging
            if (detailedBoard.prefs && (detailedBoard.prefs.backgroundImage || detailedBoard.prefs.backgroundImageScaled)) {
              console.log(`Board ${detailedBoard.name} has a background image`);
            }

            return detailedBoard;
          }
        } catch (detailError) {
          console.warn(`Could not fetch detailed info for board ${board.id}:`, detailError);
        }

        // Return original board if detailed fetch fails
        return board;
      })
    );

    return boardsWithDetails;
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

// Fetch checklists for a card
export const fetchTrelloChecklists = async (
  cardId: string,
  apiKey: string,
  token: string
): Promise<TrelloChecklist[]> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/cards/${cardId}/checklists?key=${apiKey}&token=${token}&fields=name,pos&checkItems=all&checkItem_fields=name,state,pos`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch checklists for card ${cardId}: ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Trello checklists:', error);
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

            // Fetch checklists for this card
            const trelloChecklists = await fetchTrelloChecklists(trelloCard.id, apiKey, token);

            // Convert Trello labels to TrelloX labels
            const labels = Array.isArray(trelloCard.labels) ? trelloCard.labels.map(label => ({
              id: label.id,
              text: label.name,
              color: convertTrelloColor(label.color) as any
            })) : [];

    // For the comments array, update the type assertion
    const comments = Array.isArray(trelloComments)
      ? trelloComments
          .map(comment => {
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
          })
          .filter((comment): comment is { id: string; text: string; createdAt: string; author: string; authorId: string; } => comment !== null)
      : [];

    // Similarly for attachments
    const attachments: Attachment[] = Array.isArray(trelloAttachments)
      ? trelloAttachments
          .map(attachment => {
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
          })
          .filter((attachment): attachment is Attachment => attachment !== null)
      : [];

            // Convert Trello checklists to TrelloX checklists
            const checklists = Array.isArray(trelloChecklists) ? trelloChecklists.map(checklist => {
              try {
                // Convert checklist items
                const items = Array.isArray(checklist.checkItems) ? checklist.checkItems.map(item => ({
                  id: item.id,
                  name: item.name,
                  state: item.state,
                  pos: item.pos
                })).sort((a, b) => a.pos - b.pos) : [];

                return {
                  id: checklist.id,
                  title: checklist.name,
                  items,
                  pos: checklist.pos
                };
              } catch (err) {
                console.warn('Error processing checklist:', err);
                return null;
              }
            }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.pos - b.pos) : [];

            return {
              id: trelloCard.id,
              content: trelloCard.name,
              description: trelloCard.desc || '',
              labels,
              dueDate: trelloCard.due || undefined,
              comments,
              attachments,
              checklists,
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
              checklists: [],
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

  // Get the best background image if available
  let backgroundImage: string | undefined = undefined;

  // Log the board preferences to debug
  console.log('Trello board preferences:', JSON.stringify(trelloBoard.prefs, null, 2));

  // Check for Unsplash backgrounds first (they're usually higher quality)
  if (trelloBoard.prefs.backgroundLargeUrl) {
    backgroundImage = trelloBoard.prefs.backgroundLargeUrl;
    console.log('Using Unsplash large background image:', backgroundImage);
  }
  else if (trelloBoard.prefs.backgroundFullUrl) {
    backgroundImage = trelloBoard.prefs.backgroundFullUrl;
    console.log('Using Unsplash full background image:', backgroundImage);
  }
  else if (trelloBoard.prefs.backgroundUrl) {
    backgroundImage = trelloBoard.prefs.backgroundUrl;
    console.log('Using Unsplash background image:', backgroundImage);
  }
  // Then try to get the best scaled image if available
  else if (trelloBoard.prefs.backgroundImageScaled && trelloBoard.prefs.backgroundImageScaled.length > 0) {
    // Sort by size (largest first) and take the first one
    const sortedImages = [...trelloBoard.prefs.backgroundImageScaled].sort(
      (a, b) => (b.width * b.height) - (a.width * a.height)
    );
    backgroundImage = sortedImages[0].url;
    console.log('Using scaled background image:', backgroundImage);
  }
  // Fall back to the regular background image
  else if (trelloBoard.prefs.backgroundImage) {
    backgroundImage = trelloBoard.prefs.backgroundImage;
    console.log('Using regular background image:', backgroundImage);
  }

  // If we have a background image, make sure it's a valid URL
  if (backgroundImage) {
    // Some Trello background images might be relative paths or color codes
    if (!backgroundImage.startsWith('http')) {
      // Check if it's a color code
      if (backgroundImage.startsWith('#')) {
        console.log('Background image is actually a color code:', backgroundImage);
        trelloBoard.prefs.backgroundColor = backgroundImage;
        backgroundImage = undefined;
      } else {
        // Try to convert to a full URL if it's a relative path
        try {
          // Trello sometimes uses paths like "/9/green.jpg" for backgrounds
          if (backgroundImage.startsWith('/')) {
            backgroundImage = `https://trello-backgrounds.s3.amazonaws.com${backgroundImage}`;
            console.log('Converted relative path to full URL:', backgroundImage);
          }
        } catch (error) {
          console.error('Error processing background image URL:', error);
          backgroundImage = undefined;
        }
      }
    }
  }

  // Check for Unsplash background
  if (!backgroundImage && trelloBoard.prefs.backgroundTopColor && trelloBoard.prefs.backgroundBottomColor) {
    // If no image but we have gradient colors, create a CSS gradient background
    console.log('Using gradient background colors');
    trelloBoard.prefs.backgroundColor = `linear-gradient(to bottom, ${trelloBoard.prefs.backgroundTopColor}, ${trelloBoard.prefs.backgroundBottomColor})`;
  }

  // If we still don't have a background image, try to extract it from the board URL
  // Some Trello boards have background images in their URLs
  if (!backgroundImage && trelloBoard.url) {
    try {
      const urlParams = new URL(trelloBoard.url).searchParams;
      const bgParam = urlParams.get('background');
      if (bgParam && bgParam.startsWith('http')) {
        backgroundImage = bgParam;
        console.log('Extracted background image from URL:', backgroundImage);
      }
    } catch (error) {
      console.warn('Error extracting background from URL:', error);
    }
  }

  // Create the TrelloX board with background settings
  const board: Board = {
    id: trelloBoard.id,
    title: trelloBoard.name,
    lists,
    backgroundImage,
    backgroundColor: trelloBoard.prefs.backgroundColor || '#0079BF',
    createdAt: new Date().toISOString(),
    createdBy: userId,
    members: [userId]
  };

  return board;
};
