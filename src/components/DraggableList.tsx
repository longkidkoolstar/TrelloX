import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypes, ListDragItem, CardDragItem } from './DragTypes';
import { List as ListType, Card as CardType } from '../types';
import DraggableCard from './DraggableCard';
import './List.css';

interface EmptyListDropAreaProps {
  listId: string;
  moveCard: (dragIndex: number, hoverIndex: number, sourceListId: string, targetListId: string) => void;
}

const EmptyListDropArea: React.FC<EmptyListDropAreaProps> = ({ listId, moveCard }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover: (item: CardDragItem, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = 0; // First position in the list
      const sourceListId = item.listId;
      const targetListId = listId;

      // Don't replace items with themselves
      if (sourceListId === targetListId) {
        return;
      }

      // Time to actually perform the action
      moveCard(dragIndex, hoverIndex, sourceListId, targetListId);

      // Note: we're mutating the monitor item here!
      item.index = hoverIndex;
      item.listId = targetListId;
    },
  });

  drop(ref);

  return (
    <div
      ref={ref}
      className="empty-list-drop-area"
      style={{
        minHeight: '20px',
        width: '100%'
      }}
    />
  );
};

interface DraggableListProps {
  list: ListType;
  index: number;
  moveList: (dragIndex: number, hoverIndex: number) => void;
  moveCard: (dragIndex: number, hoverIndex: number, sourceListId: string, targetListId: string) => void;
  onAddCard: (listId: string, content: string) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
  onDeleteList: (listId: string) => void;
  onEditListTitle: (listId: string, newTitle: string) => void;
  onUpdateCard: (listId: string, cardId: string, updatedCard: Partial<CardType>) => void;
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  moveList,
  moveCard,
  onAddCard,
  onDeleteCard,
  onDeleteList,
  onEditListTitle,
  onUpdateCard
}) => {
  const [newCardContent, setNewCardContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleAddCard = () => {
    if (newCardContent.trim()) {
      onAddCard(list.id, newCardContent);
      setNewCardContent('');
      setIsAddingCard(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCard();
    }
  };

  const handleTitleEdit = () => {
    if (editedTitle.trim()) {
      onEditListTitle(list.id, editedTitle);
      setIsEditing(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    }
  };

  // Configure drag
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: ItemTypes.LIST,
    item: {
      type: ItemTypes.LIST,
      id: list.id,
      index,
      title: list.title
    } as ListDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Configure drop for list reordering
  const [, drop] = useDrop({
    accept: ItemTypes.LIST,
    hover: (item: ListDragItem, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get horizontal middle
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the left
      const hoverClientX = clientOffset!.x - hoverBoundingRect.left;

      // Only perform the move when the mouse has crossed half of the items width

      // Dragging right
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      // Dragging left
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }

      // Time to actually perform the action
      moveList(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      item.index = hoverIndex;
    },
  });

  // Connect the drag and drop refs
  // Use dragPreview to make the entire list draggable, but only use the header as the drag handle
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className="list"
      style={{
        opacity: isDragging ? 0.5 : 1,
        visibility: isDragging ? 'hidden' : 'visible'
      }}
    >
      <div
        className="list-header"
        style={{ cursor: 'grab' }}
      >
        {isEditing ? (
          <input
            type="text"
            className="list-title-input"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleEdit}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h2 className="list-title" onClick={() => setIsEditing(true)}>
            {list.title}
          </h2>
        )}
        <button
          className="list-delete-button"
          onClick={() => onDeleteList(list.id)}
        >
          &times;
        </button>
      </div>
      <div className="list-cards">
        {list.cards.map((card, cardIndex) => (
          <DraggableCard
            key={card.id}
            card={card}
            index={cardIndex}
            listId={list.id}
            listTitle={list.title}
            moveCard={moveCard}
            onDelete={(cardId) => onDeleteCard(list.id, cardId)}
            onUpdateCard={onUpdateCard}
          />
        ))}
        <EmptyListDropArea listId={list.id} moveCard={moveCard} />
      </div>
      {isAddingCard ? (
        <div className="add-card-form">
          <textarea
            className="add-card-input"
            placeholder="Enter card content..."
            value={newCardContent}
            onChange={(e) => setNewCardContent(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="add-card-actions">
            <button className="add-card-button" onClick={handleAddCard}>
              Add Card
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setIsAddingCard(false);
                setNewCardContent('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="add-card-toggle"
          onClick={() => setIsAddingCard(true)}
        >
          + Add a card
        </button>
      )}
    </div>
  );
};

export default DraggableList;
