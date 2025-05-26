import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import DraggableBoard from './components/DraggableBoard'
import BoardCreator from './components/BoardCreator'
import BoardEditor from './components/BoardEditor'
import AuthContainer from './components/AuthContainer'
import TrelloImport from './components/TrelloImport'
import BoardSharingModal from './components/BoardSharingModal'
import { Board as BoardType, User } from './types'
import { onAuthStateChange, signOutUser } from './firebase/auth'
import { getUserBoards, createBoard as createFirestoreBoard, updateBoard as updateFirestoreBoard, deleteBoard as deleteFirestoreBoard } from './firebase/firestore'
import { getDominantColor, darkenColor } from './utils/colorUtils'
import { useModalContext } from './context/ModalContext'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [boards, setBoards] = useState<BoardType[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string>('')
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isImportingFromTrello, setIsImportingFromTrello] = useState(false)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [sharingBoardId, setSharingBoardId] = useState<string | null>(null)
  const [headerColor, setHeaderColor] = useState<string>('#026aa7') // Default Trello-like blue
  const { openModal } = useModalContext()

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load boards from Firestore when user is authenticated
  useEffect(() => {
    const loadUserBoards = async () => {
      if (user) {
        try {
          console.log('Loading boards for user:', user.uid);
          const loadedBoards = await getUserBoards();
          console.log('Loaded boards:', loadedBoards);

          if (loadedBoards && loadedBoards.length > 0) {
            setBoards(loadedBoards);

            // Set the current board to the first board if no board is currently selected
            if (!currentBoardId || !loadedBoards.find(board => board.id === currentBoardId)) {
              setCurrentBoardId(loadedBoards[0].id);
            }
          } else {
            console.log('No boards found for user');
            setBoards([]);
            setCurrentBoardId('');
          }
        } catch (error) {
          console.error('Error loading boards:', error);
          // Don't crash the app, just show empty state
          setBoards([]);
          setCurrentBoardId('');
        }
      }
    };

    loadUserBoards();
  }, [user])

  const handleUpdateBoard = async (updatedBoard: BoardType) => {
    try {
      // Update board in Firestore
      await updateFirestoreBoard(updatedBoard.id, updatedBoard)

      // Update local state
      setBoards(boards.map(board =>
        board.id === updatedBoard.id ? updatedBoard : board
      ))

      // If this is the current board, make sure we have the latest data
      if (updatedBoard.id === currentBoardId) {
        // Force a refresh of the current board to ensure we have the latest member data
        const { getBoardById } = await import('./firebase/firestore');
        const latestBoard = await getBoardById(updatedBoard.id);
        if (latestBoard) {
          setBoards(prevBoards =>
            prevBoards.map(board =>
              board.id === latestBoard.id ? latestBoard : board
            )
          );
        }
      }
    } catch (error) {
      console.error('Error updating board:', error)
    }
  }

  const handleAddBoard = () => {
    setIsCreatingBoard(true)
  }

  const handleEditBoard = (boardId: string) => {
    setEditingBoardId(boardId)
    openModal()
  }

  const handleShareBoard = (boardId: string) => {
    setSharingBoardId(boardId)
  }

  const handleCreateBoard = async (newBoard: Omit<BoardType, 'id' | 'createdAt' | 'createdBy' | 'members'>) => {
    try {
      // Create board in Firestore
      const createdBoard = await createFirestoreBoard(newBoard)

      // Update local state
      setBoards([...boards, createdBoard])
      setCurrentBoardId(createdBoard.id)
      setIsCreatingBoard(false)
    } catch (error) {
      console.error('Error creating board:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
      setBoards([])
      setCurrentBoardId('')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleAuthenticated = () => {
    // This will be called after successful login/signup
    // The auth state listener will update the user state
  }

  const handleImportFromTrello = () => {
    setIsImportingFromTrello(true);
  }

  const handleImportComplete = async (importedBoards: BoardType[]) => {
    try {
      // Save each imported board to Firestore
      const savedBoards: BoardType[] = [];

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

      for (const board of importedBoards) {
        console.log('Processing board:', board.title);

        // Ensure all lists have valid cards arrays and no undefined values
        const sanitizedLists = board.lists.map(list => {
          console.log(`Processing list: ${list.title}`);

          const sanitizedCards = list.cards.map(card => {
            console.log(`Processing card: ${card.content}`);

            // Create a sanitized card with default values for all fields
            const sanitizedCard = {
              id: card.id,
              content: card.content || 'Untitled Card',
              description: card.description || '',
              labels: Array.isArray(card.labels) ? card.labels.map(label => ({
                id: label.id,
                text: label.text || '',
                color: label.color || 'blue'
              })) : [],
              comments: Array.isArray(card.comments) ? card.comments.map(comment => ({
                id: comment.id,
                text: comment.text || '',
                createdAt: comment.createdAt || new Date().toISOString(),
                author: comment.author || 'Unknown',
                authorId: comment.authorId || ''
              })) : [],
              attachments: Array.isArray(card.attachments) ? card.attachments.map(attachment => ({
                id: attachment.id,
                name: attachment.name || '',
                url: attachment.url || '',
                createdAt: attachment.createdAt || new Date().toISOString(),
                uploadedBy: attachment.uploadedBy || ''
              })) : [],
              checklists: Array.isArray(card.checklists) ? card.checklists.map(checklist => ({
                id: checklist.id,
                title: checklist.title || '',
                items: Array.isArray(checklist.items) ? checklist.items.map(item => ({
                  id: item.id,
                  name: item.name || '',
                  state: item.state || 'incomplete',
                  pos: typeof item.pos === 'number' ? item.pos : 0
                })) : [],
                pos: typeof checklist.pos === 'number' ? checklist.pos : 0
              })) : [],
              createdAt: card.createdAt || new Date().toISOString(),
              createdBy: card.createdBy || '',
              assignedTo: Array.isArray(card.assignedTo) ? card.assignedTo : []
            };

            return removeUndefined(sanitizedCard);
          });

          return removeUndefined({
            id: list.id,
            title: list.title || 'Untitled List',
            cards: sanitizedCards,
            createdAt: list.createdAt || new Date().toISOString(),
            createdBy: list.createdBy || ''
          });
        });

        // Create a clean board object with no undefined values
        const cleanBoardData = removeUndefined({
          title: board.title || 'Untitled Board',
          backgroundColor: board.backgroundColor || '#0079BF',
          backgroundImage: board.backgroundImage, // Include the background image
          lists: sanitizedLists
        });

        console.log('Sanitized board data:', JSON.stringify(cleanBoardData).substring(0, 200) + '...');
        console.log('Background info being saved:', {
          backgroundColor: board.backgroundColor,
          backgroundImage: board.backgroundImage
        });

        // Create board in Firestore with sanitized data
        const createdBoard = await createFirestoreBoard(cleanBoardData);

        savedBoards.push(createdBoard);
      }

      // Update local state
      setBoards([...boards, ...savedBoards]);

      // Set the current board to the first imported board
      if (savedBoards.length > 0) {
        setCurrentBoardId(savedBoards[0].id);
      }

      // Close the import modal
      setIsImportingFromTrello(false);
    } catch (error) {
      console.error('Error saving imported boards:', error);
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    try {
      // Delete board from Firestore
      await deleteFirestoreBoard(boardId)

      // Update local state
      const updatedBoards = boards.filter(board => board.id !== boardId)
      setBoards(updatedBoards)

      // If the deleted board was the current board, select another board
      if (boardId === currentBoardId) {
        if (updatedBoards.length > 0) {
          setCurrentBoardId(updatedBoards[0].id)
        } else {
          setCurrentBoardId('')
        }
      }
    } catch (error) {
      console.error('Error deleting board:', error)
    }
  }

  const currentBoard = boards.find(board => board.id === currentBoardId) || null

  // Update header color when current board changes
  useEffect(() => {
    const updateHeaderColor = async () => {
      if (currentBoard) {
        if (currentBoard.backgroundImage) {
          // If there's a background image, extract its dominant color
          try {
            const dominantColor = await getDominantColor(currentBoard.backgroundImage);
            setHeaderColor(dominantColor);
          } catch (error) {
            console.error('Error extracting dominant color:', error);
            // If there's an error, use the board's background color or default
            const baseColor = currentBoard.backgroundColor || '#026aa7';
            setHeaderColor(darkenColor(baseColor, 0.15)); // Darken by 15%
          }
        } else if (currentBoard.backgroundColor) {
          // If there's only a background color, darken it slightly to differentiate from the board
          const darkerColor = darkenColor(currentBoard.backgroundColor, 0.15); // Darken by 15%
          setHeaderColor(darkerColor);
        } else {
          // Default color
          setHeaderColor('#026aa7');
        }
      }
    };

    updateHeaderColor();
  }, [currentBoard]);

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <AuthContainer onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app">
      <Header
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={setCurrentBoardId}
        onAddBoard={handleAddBoard}
        onDeleteBoard={handleDeleteBoard}
        onEditBoard={handleEditBoard}
        onShareBoard={handleShareBoard}
        onImportFromTrello={handleImportFromTrello}
        user={user}
        onSignOut={handleSignOut}
        headerColor={headerColor}
      />

      {currentBoard && (
        <DraggableBoard
          board={currentBoard}
          onUpdateBoard={handleUpdateBoard}
        />
      )}

      {isCreatingBoard && (
        <BoardCreator
          onCreateBoard={handleCreateBoard}
          onCancel={() => setIsCreatingBoard(false)}
        />
      )}

      {isImportingFromTrello && user && (
        <TrelloImport
          userId={user.uid}
          onImportComplete={handleImportComplete}
          onCancel={() => setIsImportingFromTrello(false)}
        />
      )}

      {editingBoardId && (
        <BoardEditor
          board={boards.find(board => board.id === editingBoardId)!}
          onUpdateBoard={handleUpdateBoard}
          onClose={() => setEditingBoardId(null)}
        />
      )}

      {sharingBoardId && (
        <BoardSharingModal
          board={boards.find(board => board.id === sharingBoardId)!}
          onClose={() => setSharingBoardId(null)}
          onBoardUpdate={handleUpdateBoard}
        />
      )}
    </div>
  )
}

export default App
