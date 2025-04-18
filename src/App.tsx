import React, { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Board from './components/Board'
import BoardCreator from './components/BoardCreator'
import { Board as BoardType } from './types'
import { saveBoards, loadBoards } from './services/localStorage'

function App() {
  const [boards, setBoards] = useState<BoardType[]>([])
  const [currentBoardId, setCurrentBoardId] = useState<string>('')
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)

  // Load boards from localStorage on initial render
  useEffect(() => {
    const loadedBoards = loadBoards()
    setBoards(loadedBoards)

    // Set the current board to the first board if available
    if (loadedBoards.length > 0) {
      setCurrentBoardId(loadedBoards[0].id)
    }
  }, [])

  // Save boards to localStorage whenever they change
  useEffect(() => {
    if (boards.length > 0) {
      saveBoards(boards)
    }
  }, [boards])

  const handleUpdateBoard = (updatedBoard: BoardType) => {
    setBoards(boards.map(board =>
      board.id === updatedBoard.id ? updatedBoard : board
    ))
  }

  const handleAddBoard = () => {
    setIsCreatingBoard(true)
  }

  const handleCreateBoard = (newBoard: BoardType) => {
    setBoards([...boards, newBoard])
    setCurrentBoardId(newBoard.id)
    setIsCreatingBoard(false)
  }

  const currentBoard = boards.find(board => board.id === currentBoardId) || null

  return (
    <div className="app">
      <Header
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={setCurrentBoardId}
        onAddBoard={handleAddBoard}
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
    </div>
  )
}

export default App
