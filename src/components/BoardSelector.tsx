import React, { useState } from 'react';
import { Board } from '../types';
import './BoardSelector.css';

interface BoardSelectorProps {
  boards: Board[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: () => void;
}

const BoardSelector: React.FC<BoardSelectorProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  onAddBoard
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentBoard = boards.find(board => board.id === currentBoardId);
  
  return (
    <div className="board-selector">
      <button 
        className="board-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentBoard?.title || 'Select a board'} ▼
      </button>
      
      {isOpen && (
        <div className="board-selector-dropdown">
          <div className="board-selector-dropdown-header">
            <h3>Your Boards</h3>
          </div>
          <ul className="board-selector-list">
            {boards.map(board => (
              <li 
                key={board.id}
                className={`board-selector-item ${board.id === currentBoardId ? 'active' : ''}`}
                onClick={() => {
                  onSelectBoard(board.id);
                  setIsOpen(false);
                }}
              >
                <div 
                  className="board-selector-color" 
                  style={{ backgroundColor: board.backgroundColor || '#0079bf' }}
                ></div>
                <span>{board.title}</span>
              </li>
            ))}
            <li 
              className="board-selector-item board-selector-add"
              onClick={() => {
                onAddBoard();
                setIsOpen(false);
              }}
            >
              <div className="board-selector-add-icon">+</div>
              <span>Create new board</span>
            </li>
          </ul>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="board-selector-backdrop"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default BoardSelector;
