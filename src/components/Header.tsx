import React from 'react';
import { Board } from '../types';
import BoardSelector from './BoardSelector';
import './Header.css';

interface HeaderProps {
  boards: Board[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: () => void;
}

const Header: React.FC<HeaderProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  onAddBoard
}) => {
  return (
    <header className="header">
      <div className="header-logo">
        <h1>TrelloX</h1>
      </div>
      <div className="header-actions">
        <BoardSelector
          boards={boards}
          currentBoardId={currentBoardId}
          onSelectBoard={onSelectBoard}
          onAddBoard={onAddBoard}
        />
      </div>
    </header>
  );
};

export default Header;
