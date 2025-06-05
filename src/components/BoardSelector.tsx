import React, { useState } from 'react';
import { Board } from '../types';
import './BoardSelector.css';

interface BoardSelectorProps {
  boards: Board[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: () => void;
  onDeleteBoard?: (boardId: string) => void;
  onEditBoard?: (boardId: string) => void;
}

const BoardSelector: React.FC<BoardSelectorProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  onAddBoard,
  onDeleteBoard,
  onEditBoard
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
              >
                <div
                  className="board-selector-board-content"
                  onClick={() => {
                    onSelectBoard(board.id);
                    setIsOpen(false);
                  }}
                >
                  <div
                    className="board-selector-color"
                    style={{
                      backgroundColor: board.backgroundImage ? 'transparent' : board.backgroundColor || '#0079bf',
                      backgroundImage: board.backgroundImage ? `url(${board.backgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  ></div>
                  <span>{board.title}</span>
                </div>
                {onEditBoard && (
                  <button
                    className="board-selector-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditBoard(board.id);
                    }}
                    title="Edit board"
                  >
                    <i className="fas fa-cog board-edit-icon"></i>
                  </button>
                )}
                {onDeleteBoard && (
                  <button
                    className="board-selector-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete the board "${board.title}"? This action cannot be undone.`)) {
                        onDeleteBoard(board.id);
                      }
                    }}
                    title="Delete board"
                  >
                    ×
                  </button>
                )}
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
