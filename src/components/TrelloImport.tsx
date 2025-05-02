import React, { useState } from 'react';
import {
  fetchTrelloBoards,
  fetchTrelloLists,
  fetchTrelloCards,
  convertTrelloBoard
} from '../services/trelloImport';
import { Board } from '../types';
import './TrelloImport.css';

interface TrelloImportProps {
  userId: string;
  onImportComplete: (boards: Board[]) => void;
  onCancel: () => void;
}

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
  selected?: boolean;
}

const TrelloImport: React.FC<TrelloImportProps> = ({ userId, onImportComplete, onCancel }) => {
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'credentials' | 'selectBoards' | 'importing'>('credentials');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentBoardName: '' });

  // Fetch boards from Trello
  const handleFetchBoards = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fetchedBoards = await fetchTrelloBoards(apiKey, token);
      setBoards(fetchedBoards.map(board => ({ ...board, selected: false })));
      setStep('selectBoards');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Trello boards');
    } finally {
      setLoading(false);
    }
  };

  // Toggle board selection
  const toggleBoardSelection = (boardId: string) => {
    setBoards(boards.map(board =>
      board.id === boardId ? { ...board, selected: !board.selected } : board
    ));
  };

  // Select all boards
  const selectAllBoards = () => {
    setBoards(boards.map(board => ({ ...board, selected: true })));
  };

  // Deselect all boards
  const deselectAllBoards = () => {
    setBoards(boards.map(board => ({ ...board, selected: false })));
  };

  // Import selected boards
  const handleImportBoards = async () => {
    const selectedBoards = boards.filter(board => board.selected);

    if (selectedBoards.length === 0) {
      setError('Please select at least one board to import');
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: selectedBoards.length, currentBoardName: '' });
    setError(null);

    const importedBoards: Board[] = [];
    const failedBoards: string[] = [];

    for (let i = 0; i < selectedBoards.length; i++) {
      try {
        const board = selectedBoards[i];
        setImportProgress({
          current: i + 1,
          total: selectedBoards.length,
          currentBoardName: board.name
        });
        console.log(`Importing board ${i + 1}/${selectedBoards.length}: ${board.name}`);

        // Fetch lists and cards for the board
        let lists: string | any[] = [];
        let cards: string | any[] = [];

        try {
          lists = await fetchTrelloLists(board.id, apiKey, token);
          console.log(`Fetched ${lists.length} lists for board ${board.name}`);
        } catch (listError) {
          console.error(`Error fetching lists for board ${board.name}:`, listError);
          lists = [];
        }

        try {
          cards = await fetchTrelloCards(board.id, apiKey, token);
          console.log(`Fetched ${cards.length} cards for board ${board.name}`);
        } catch (cardError) {
          console.error(`Error fetching cards for board ${board.name}:`, cardError);
          cards = [];
        }

        if (lists.length === 0) {
          console.warn(`No lists found for board ${board.name}, creating an empty board`);
        }

        // Convert to TrelloX format
        const convertedBoard = await convertTrelloBoard(
          board,
          lists,
          cards,
          apiKey,
          token,
          userId
        );

        // Log the background information for debugging
        console.log(`Board ${board.name} - Original background info:`, {
          backgroundImage: board.prefs.backgroundImage,
          backgroundImageScaled: board.prefs.backgroundImageScaled,
          backgroundUrl: board.prefs.backgroundUrl,
          backgroundFullUrl: board.prefs.backgroundFullUrl,
          backgroundLargeUrl: board.prefs.backgroundLargeUrl,
          backgroundColor: board.prefs.backgroundColor,
          backgroundTopColor: board.prefs.backgroundTopColor,
          backgroundBottomColor: board.prefs.backgroundBottomColor
        });

        console.log(`Board ${board.name} - Converted background info:`, {
          backgroundImage: convertedBoard.backgroundImage,
          backgroundColor: convertedBoard.backgroundColor
        });

        importedBoards.push(convertedBoard);
        console.log(`Successfully imported board: ${board.name}`);
      } catch (boardError: any) {
        console.error(`Failed to import board ${selectedBoards[i].name}:`, boardError);
        failedBoards.push(selectedBoards[i].name);
      }
    }

    if (importedBoards.length > 0) {
      // Call the onImportComplete callback with the imported boards
      onImportComplete(importedBoards);

      // If some boards failed, show a warning
      if (failedBoards.length > 0) {
        const failedBoardsMessage = failedBoards.join(', ');
        console.warn(`Some boards failed to import: ${failedBoardsMessage}`);
        // We don't set an error here because we want to proceed with the successful imports
      }
    } else {
      setError('Failed to import any boards. Please check your API key and token.');
      setStep('selectBoards');
    }
  };

  return (
    <div className="trello-import-container">
      <div className="trello-import-modal">
        <h2>Import from Trello</h2>

        {error && <div className="error-message">{error}</div>}

        {step === 'credentials' && (
          <form onSubmit={handleFetchBoards}>
            <div className="form-group">
              <label htmlFor="apiKey">Trello API Key</label>
              <input
                type="text"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <small>
                <a
                  href="https://trello.com/app-key"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get your API key
                </a>
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="token">Trello Token</label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <small>
                After getting your API key, click on the "Token" link on that page to generate a token.
              </small>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="cancel-button"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect to Trello'}
              </button>
            </div>
          </form>
        )}

        {step === 'selectBoards' && (
          <div>
            <p>Select the boards you want to import:</p>

            <div className="select-all-controls">
              <button
                type="button"
                className="select-all-button"
                onClick={selectAllBoards}
              >
                Select All
              </button>
              <button
                type="button"
                className="deselect-all-button"
                onClick={deselectAllBoards}
              >
                Deselect All
              </button>
            </div>

            <div className="board-list">
              {boards.map(board => (
                <div
                  key={board.id}
                  className={`board-item ${board.selected ? 'selected' : ''}`}
                  onClick={() => toggleBoardSelection(board.id)}
                >
                  <input
                    type="checkbox"
                    checked={board.selected || false}
                    onChange={() => toggleBoardSelection(board.id)}
                  />
                  <div
                    className="board-preview"
                    style={
                      // Check for Unsplash backgrounds first
                      board.prefs.backgroundLargeUrl
                        ? { backgroundImage: `url(${board.prefs.backgroundLargeUrl})` }
                        : board.prefs.backgroundFullUrl
                          ? { backgroundImage: `url(${board.prefs.backgroundFullUrl})` }
                          : board.prefs.backgroundUrl
                            ? { backgroundImage: `url(${board.prefs.backgroundUrl})` }
                            // Then check for scaled images
                            : board.prefs.backgroundImageScaled && board.prefs.backgroundImageScaled.length > 0
                              ? { backgroundImage: `url(${board.prefs.backgroundImageScaled[0].url})` }
                              // Then regular background image
                              : board.prefs.backgroundImage
                                ? { backgroundImage: `url(${board.prefs.backgroundImage})` }
                                // Gradient background
                                : board.prefs.backgroundTopColor && board.prefs.backgroundBottomColor
                                  ? { backgroundImage: `linear-gradient(to bottom, ${board.prefs.backgroundTopColor}, ${board.prefs.backgroundBottomColor})` }
                                  // Fallback to solid color
                                  : { backgroundColor: board.prefs.backgroundColor || '#0079bf' }
                    }
                  ></div>
                  <div className="board-info">
                    <span className="board-name">{board.name}</span>
                    {board.desc && <span className="board-description">{board.desc}</span>}
                    <span className="board-background-info">
                      {board.prefs.backgroundLargeUrl || board.prefs.backgroundFullUrl || board.prefs.backgroundUrl ?
                        '✓ Has Unsplash background image' :
                        board.prefs.backgroundImage || (board.prefs.backgroundImageScaled && board.prefs.backgroundImageScaled.length > 0) ?
                          '✓ Has custom background image' :
                          board.prefs.backgroundTopColor && board.prefs.backgroundBottomColor ?
                            '✓ Has gradient background' :
                            board.prefs.backgroundColor ?
                              `✓ Background color: ${board.prefs.backgroundColor}` :
                              '✓ Default background'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="button-group">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setStep('credentials')}
              >
                Back
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleImportBoards}
              >
                Import Selected Boards
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="importing-status">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="importing-board-name">
              {importProgress.currentBoardName && (
                <strong>{importProgress.currentBoardName}</strong>
              )}
            </p>
            <p>
              Importing board {importProgress.current} of {importProgress.total}...
            </p>
            <p className="importing-note">
              This may take a while depending on the size of your boards.
            </p>
            <p className="importing-note">
              Some cards may be imported without comments or attachments due to API limitations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrelloImport;
