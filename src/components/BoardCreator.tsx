import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../types';
import './BoardCreator.css';

interface BoardCreatorProps {
  onCreateBoard: (board: Board) => void;
  onCancel: () => void;
}

const BACKGROUND_COLORS = [
  '#0079bf',
  '#d29034',
  '#519839',
  '#b04632',
  '#89609e',
  '#cd5a91',
  '#4bbf6b',
  '#00aecc'
];

const BoardCreator: React.FC<BoardCreatorProps> = ({ onCreateBoard, onCancel }) => {
  const [title, setTitle] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    const newBoard: Board = {
      id: `board-${uuidv4()}`,
      title: title.trim(),
      backgroundColor,
      lists: [
        {
          id: `list-${uuidv4()}`,
          title: 'To Do',
          cards: []
        },
        {
          id: `list-${uuidv4()}`,
          title: 'In Progress',
          cards: []
        },
        {
          id: `list-${uuidv4()}`,
          title: 'Done',
          cards: []
        }
      ]
    };
    
    onCreateBoard(newBoard);
  };

  return (
    <div className="board-creator-overlay">
      <div className="board-creator">
        <div className="board-creator-header">
          <h2>Create Board</h2>
          <button className="board-creator-close" onClick={onCancel}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="board-creator-preview" style={{ backgroundColor }}>
            <input
              type="text"
              className="board-creator-title-input"
              placeholder="Add board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="board-creator-colors">
            <h3>Background</h3>
            <div className="board-creator-color-options">
              {BACKGROUND_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`board-creator-color-option ${backgroundColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBackgroundColor(color)}
                />
              ))}
            </div>
          </div>
          
          <div className="board-creator-actions">
            <button 
              type="submit" 
              className="board-creator-submit"
              disabled={!title.trim()}
            >
              Create Board
            </button>
            <button 
              type="button" 
              className="board-creator-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardCreator;
