import React, { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Board from './components/Board'
import BoardCreator from './components/BoardCreator'
import AuthContainer from './components/AuthContainer'
import TrelloImport from './components/TrelloImport'
import { Board as BoardType, User } from './types'
import { onAuthStateChange, getCurrentUser, signOutUser } from './firebase/auth'
import { getUserBoards, createBoard as createFirestoreBoard, updateBoard as updateFirestoreBoard, deleteBoard as deleteFirestoreBoard } from './firebase/firestore'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [boards, setBoards] = useState<BoardType[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string>('')
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [isImportingFromTrello, setIsImportingFromTrello] = useState(false)

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
    } catch (error) {
      console.error('Error updating board:', error)
    }
  }

  const handleAddBoard = () => {
    setIsCreatingBoard(true)
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

      for (const board of importedBoards) {
        // Create board in Firestore
        const createdBoard = await createFirestoreBoard({
          title: board.title,
          backgroundColor: board.backgroundColor,
          lists: board.lists
        });

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
        onImportFromTrello={handleImportFromTrello}
        user={user}
        onSignOut={handleSignOut}
      />

      {currentBoard && (
        <Board
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
    </div>
  )
}

export default App
