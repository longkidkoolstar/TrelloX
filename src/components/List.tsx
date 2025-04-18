import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { List as ListType, Card as CardType } from '../types';
import Card from './Card';
import './List.css';

interface ListProps {
  list: ListType;
  index: number;
  onAddCard: (listId: string, content: string) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
  onDeleteList: (listId: string) => void;
  onEditListTitle: (listId: string, newTitle: string) => void;
  onUpdateCard: (listId: string, cardId: string, updatedCard: Partial<CardType>) => void;
}

const List: React.FC<ListProps> = ({
  list,
  index,
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: list.id,
    data: { type: 'list', list }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      className="list"
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <div
        className="list-header"
        {...listeners}
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
        <SortableContext
          items={list.cards.map(card => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card, cardIndex) => (
            <Card
              key={card.id}
              card={card}
              index={cardIndex}
              listId={list.id}
              listTitle={list.title}
              onDelete={(cardId) => onDeleteCard(list.id, cardId)}
              onUpdateCard={onUpdateCard}
            />
          ))}
        </SortableContext>
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

export default List;
