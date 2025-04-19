import React from 'react';
import { Board, User } from '../types';
import BoardSelector from './BoardSelector';
import './Header.css';

interface HeaderProps {
  boards: Board[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: () => void;
  onDeleteBoard?: (boardId: string) => void;
  onImportFromTrello?: () => void;
  user: User;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({
  boards,
  currentBoardId,
  onSelectBoard,
  onAddBoard,
  onDeleteBoard,
  onImportFromTrello,
  user,
  onSignOut
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
          onDeleteBoard={onDeleteBoard}
        />
      </div>
      <div className="header-user">
        {onImportFromTrello && (
          <button className="import-button" onClick={onImportFromTrello}>
            Import from Trello
          </button>
        )}
        <span className="user-name">{user.displayName || user.email}</span>
        <button className="sign-out-button" onClick={onSignOut}>Sign Out</button>
      </div>
    </header>
  );
};

export default Header;
