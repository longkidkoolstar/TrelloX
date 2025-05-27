import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { StickyNote as StickyNoteType, BoardMember } from '../types';
import { useModalContext } from '../context/ModalContext';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { ItemTypes } from './DragTypes';
import './StickyNote.css';

interface StickyNoteProps {
  note: StickyNoteType;
  onUpdate: (noteId: string, updatedNote: Partial<StickyNoteType>) => void;
  onDelete: (noteId: string) => void;
  boardMembers?: BoardMember[];
}

const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onDelete, boardMembers = [] }) => {
  // Automatically enter edit mode if this is a sticky note with default content
  const isDefaultContent = note.content === 'New sticky note' || note.content === 'Sticky note';
  const [isEditing, setIsEditing] = useState(isDefaultContent);
  const [content, setContent] = useState(isDefaultContent ? '' : note.content);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { isModalOpen } = useModalContext();

  // Helper functions for creator attribution
  const shouldShowCreatorIndicator = () => {
    // Only show when board has multiple members
    // For backwards compatibility, show indicators even if createdBy is missing
    return boardMembers.length > 1;
  };

  const getCreatorInfo = () => {
    if (!note.createdBy) return null;
    return boardMembers.find(member => member.userId === note.createdBy);
  };

  const getCreatorDisplayName = () => {
    const creator = getCreatorInfo();
    if (!creator) {
      // Backwards compatibility: If no creator found, show generic message
      return note.createdBy ? 'Unknown User' : 'Legacy Note';
    }
    return creator.displayName || creator.email || 'Unknown User';
  };

  const getCreatorInitials = () => {
    const creator = getCreatorInfo();
    if (!creator) {
      // Backwards compatibility: Show different icon for legacy notes
      return note.createdBy ? '?' : '📝';
    }

    if (creator.displayName && creator.displayName.trim()) {
      return creator.displayName
        .trim()
        .split(' ')
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }

    if (creator.email && creator.email.trim()) {
      return creator.email.charAt(0).toUpperCase();
    }

    return '?';
  };

  // Configure drag
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.STICKY_NOTE,
    item: { id: note.id, type: ItemTypes.STICKY_NOTE, index: 0 },
    canDrag: !isModalOpen && !isEditing, // Disable dragging when modal is open or when editing
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Connect the drag ref
  drag(ref);

  // Focus textarea when editing starts and select all text if it has default content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();

      // If this is a note with default content, the textarea will be empty
      // so no need to select anything
    }
  }, [isEditing]);

  // Save content when editing ends
  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);

      // If content is empty, set a default message
      const finalContent = content.trim() === '' ? 'Sticky note' : content;

      if (finalContent !== note.content) {
        setContent(finalContent);
        onUpdate(note.id, { content: finalContent });
      }
    }
  };

  // Handle right-click to show context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'Edit',
      icon: '✏️',
      onClick: () => setIsEditing(true),
    },
    {
      label: 'Change Color',
      icon: '🎨',
      onClick: () => {
        // Cycle through colors: yellow -> green -> blue -> pink -> yellow
        const colors = ['yellow', 'green', 'blue', 'pink'] as const;
        const currentIndex = colors.indexOf(note.color);
        const nextColor = colors[(currentIndex + 1) % colors.length];
        onUpdate(note.id, { color: nextColor });
      },
    },
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: () => onDelete(note.id),
    },
  ];

  // Calculate rotation style
  const rotationStyle = {
    transform: `rotate(${note.rotation || 0}deg)`,
  };

  return (
    <div
      ref={ref}
      className={`sticky-note sticky-note-${note.color}`}
      style={{
        left: `${note.position.x}px`,
        top: `${note.position.y}px`,
        opacity: isDragging ? 0.5 : 1,
        ...rotationStyle,
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => setIsEditing(true)}
      onClick={() => {
        // Enter edit mode on single click if the note has default content
        if (note.content === 'Sticky note' || note.content === 'New sticky note') {
          setIsEditing(true);
          setContent('');
        }
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="sticky-note-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleBlur();
            }
          }}
        />
      ) : (
        <div className="sticky-note-content">{note.content}</div>
      )}

      <button
        className="sticky-note-delete-btn"
        onClick={() => onDelete(note.id)}
        title="Delete sticky note"
      >
        ×
      </button>

      {/* Creator Attribution Indicator */}
      {shouldShowCreatorIndicator() && (
        <div
          className="sticky-note-creator-indicator"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {getCreatorInfo()?.photoURL && !imageLoadError ? (
            <img
              src={getCreatorInfo()!.photoURL}
              alt={getCreatorDisplayName()}
              className="sticky-note-creator-avatar"
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <div className="sticky-note-creator-initials">
              {getCreatorInitials()}
            </div>
          )}

          {/* Tooltip */}
          {showTooltip && (
            <div className="sticky-note-creator-tooltip">
              Created by {getCreatorDisplayName()}
            </div>
          )}
        </div>
      )}

      {showContextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
};

export default StickyNote;
