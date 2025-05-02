import React, { useState, useRef, ChangeEvent } from 'react';
import { Board } from '../types';
import { uploadImage, isValidImageUrl } from '../firebase/storage';
import './BoardCreator.css';

interface BoardCreatorProps {
  onCreateBoard: (board: Omit<Board, 'id' | 'createdAt' | 'createdBy' | 'members'>) => void;
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

type BackgroundType = 'color' | 'image';

const BoardCreator: React.FC<BoardCreatorProps> = ({ onCreateBoard, onCancel }) => {
  const [title, setTitle] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('color');
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // First try to use the File API to create a local object URL
      // This is a fallback in case Firebase Storage has CORS issues
      const objectUrl = URL.createObjectURL(file);
      setBackgroundImage(objectUrl);
      setBackgroundType('image');

      // Try to upload to Firebase in the background
      try {
        const downloadURL = await uploadImage(file);
        // If successful, replace the object URL with the Firebase URL
        setBackgroundImage(downloadURL);
      } catch (uploadError) {
        console.warn('Firebase upload failed, using local object URL instead:', uploadError);
        // We'll continue using the object URL if Firebase upload fails
      }
    } catch (error) {
      console.error('Error handling image:', error);
      setError('Failed to process image. Please try again or use an image URL instead.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlSubmit = async () => {
    if (!imageUrl.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      const isValid = await isValidImageUrl(imageUrl);
      if (isValid) {
        setBackgroundImage(imageUrl);
        setBackgroundType('image');
        setImageUrl('');
      } else {
        setError('Invalid image URL. Please enter a valid direct link to an image.');
      }
    } catch (error) {
      console.error('Error validating image URL:', error);
      setError('Failed to validate image URL. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const newBoard: Omit<Board, 'id' | 'createdAt' | 'createdBy' | 'members'> = {
      title: title.trim(),
      backgroundColor: backgroundType === 'color' ? backgroundColor : undefined,
      backgroundImage: backgroundType === 'image' ? backgroundImage : undefined,
      lists: [
        {
          id: crypto.randomUUID(),
          title: 'To Do',
          cards: []
        },
        {
          id: crypto.randomUUID(),
          title: 'In Progress',
          cards: []
        },
        {
          id: crypto.randomUUID(),
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
          <div
            className="board-creator-preview"
            style={
              backgroundType === 'color'
                ? { backgroundColor }
                : { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            }
          >
            <input
              type="text"
              className="board-creator-title-input"
              placeholder="Add board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="board-creator-error">
              {error}
            </div>
          )}

          <div className="board-creator-background-tabs">
            <button
              type="button"
              className={`board-creator-tab ${backgroundType === 'color' ? 'active' : ''}`}
              onClick={() => setBackgroundType('color')}
            >
              Colors
            </button>
            <button
              type="button"
              className={`board-creator-tab ${backgroundType === 'image' ? 'active' : ''}`}
              onClick={() => setBackgroundType('image')}
            >
              Images
            </button>
          </div>

          {backgroundType === 'color' && (
            <div className="board-creator-colors">
              <h3>Background Color</h3>
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
          )}

          {backgroundType === 'image' && (
            <div className="board-creator-images">
              <h3>Background Image</h3>

              <div className="board-creator-image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="board-creator-upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>

              <div className="board-creator-image-url">
                <input
                  type="text"
                  placeholder="Or enter image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isUploading}
                  className="board-creator-url-input"
                />
                <button
                  type="button"
                  className="board-creator-url-button"
                  onClick={handleImageUrlSubmit}
                  disabled={isUploading || !imageUrl.trim()}
                >
                  Use URL
                </button>
              </div>

              {backgroundImage && backgroundType === 'image' && (
                <div className="board-creator-current-image">
                  <p>Current image selected</p>
                  <button
                    type="button"
                    className="board-creator-remove-image"
                    onClick={() => {
                      setBackgroundImage('');
                      setBackgroundType('color');
                    }}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="board-creator-actions">
            <button
              type="submit"
              className="board-creator-submit"
              disabled={!title.trim() || (backgroundType === 'image' && !backgroundImage)}
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
