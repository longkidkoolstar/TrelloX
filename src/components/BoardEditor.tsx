import React, { useState, useRef, ChangeEvent } from 'react';
import { Board } from '../types';
import { uploadImage, isValidImageUrl } from '../firebase/storage';
import { useModalContext } from '../context/ModalContext';
import './BoardEditor.css';

interface BoardEditorProps {
  board: Board;
  onUpdateBoard: (updatedBoard: Board) => void;
  onClose: () => void;
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

const BoardEditor: React.FC<BoardEditorProps> = ({ board, onUpdateBoard, onClose }) => {
  const [title, setTitle] = useState(board.title);
  const [backgroundColor, setBackgroundColor] = useState(board.backgroundColor || BACKGROUND_COLORS[0]);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    board.backgroundImage ? 'image' : 'color'
  );
  const [backgroundImage, setBackgroundImage] = useState<string>(board.backgroundImage || '');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { closeModal } = useModalContext();

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

    const updatedBoard: Board = {
      ...board,
      title: title.trim(),
      backgroundColor: backgroundType === 'color' ? backgroundColor : undefined,
      backgroundImage: backgroundType === 'image' ? backgroundImage : undefined,
    };

    onUpdateBoard(updatedBoard);
    onClose();
    closeModal();
  };

  const handleCancel = () => {
    onClose();
    closeModal();
  };

  return (
    <div className="board-editor-overlay" onClick={handleCancel}>
      <div className="board-editor" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Board</h2>
        <button className="board-editor-close" onClick={handleCancel}>&times;</button>

        <form onSubmit={handleSubmit}>
          <div className="board-editor-section">
            <label htmlFor="board-title">Board Title</label>
            <input
              id="board-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title"
              required
              autoFocus
            />
          </div>

          <div className="board-editor-section">
            <label>Background</label>
            <div className="board-editor-background-options">
              <button
                type="button"
                className={`board-editor-background-option ${backgroundType === 'color' ? 'active' : ''}`}
                onClick={() => setBackgroundType('color')}
              >
                Colors
              </button>
              <button
                type="button"
                className={`board-editor-background-option ${backgroundType === 'image' ? 'active' : ''}`}
                onClick={() => setBackgroundType('image')}
              >
                Images
              </button>
            </div>

            {backgroundType === 'color' && (
              <div className="board-editor-colors">
                {BACKGROUND_COLORS.map((color) => (
                  <div
                    key={color}
                    className={`board-editor-color ${backgroundColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                  >
                    {backgroundColor === color && <span className="board-editor-color-check">✓</span>}
                  </div>
                ))}
              </div>
            )}

            {backgroundType === 'image' && (
              <div className="board-editor-image-options">
                {backgroundImage && (
                  <div className="board-editor-current-image">
                    <img src={backgroundImage} alt="Board background" />
                    <button
                      type="button"
                      className="board-editor-remove-image"
                      onClick={() => setBackgroundImage('')}
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="board-editor-image-upload">
                  <button
                    type="button"
                    className="board-editor-upload-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="board-editor-image-url">
                  <input
                    type="text"
                    placeholder="Or enter an image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    onClick={handleImageUrlSubmit}
                    disabled={!imageUrl.trim() || isUploading}
                  >
                    Add
                  </button>
                </div>

                {error && <div className="board-editor-error">{error}</div>}
              </div>
            )}
          </div>

          <div className="board-editor-actions">
            <button type="submit" className="board-editor-save-button" disabled={!title.trim() || isUploading}>
              Save
            </button>
            <button type="button" className="board-editor-cancel-button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardEditor;