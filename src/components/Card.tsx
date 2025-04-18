import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType, Label } from '../types';
import CardModal from './CardModal';
import './Card.css';

interface CardProps {
  card: CardType;
  index: number;
  listId: string;
  listTitle: string;
  onDelete: (cardId: string) => void;
  onUpdateCard: (listId: string, cardId: string, updatedCard: Partial<CardType>) => void;
}

const Card: React.FC<CardProps> = ({
  card,
  index,
  listId,
  listTitle,
  onDelete,
  onUpdateCard
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;

    const dueDate = new Date(dateString);
    const now = new Date();
    const isPastDue = dueDate < now;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const formattedDate = dueDate.toLocaleDateString(undefined, options);

    return (
      <div className={`card-due-date ${isPastDue ? 'past-due' : ''}`}>
        <span className="due-date-icon">🕒</span>
        <span className="due-date-text">{formattedDate}</span>
      </div>
    );
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, listId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <>
      <div
        className="card"
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setIsModalOpen(true)}
      >
        {card.labels.length > 0 && (
          <div className="card-labels">
            {card.labels.map((label) => (
              <div
                key={label.id}
                className={`card-label card-label-${label.color}`}
                title={label.text}
              >
                {label.text && <span className="card-label-text">{label.text}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="card-content">{card.content}</div>

        <div className="card-badges">
          {formatDueDate(card.dueDate)}

          {card.description && (
            <div className="card-badge">
              <span className="card-badge-icon">📝</span>
            </div>
          )}

          {card.comments.length > 0 && (
            <div className="card-badge">
              <span className="card-badge-icon">💬</span>
              <span className="card-badge-text">{card.comments.length}</span>
            </div>
          )}

          {card.attachments.length > 0 && (
            <div className="card-badge">
              <span className="card-badge-icon">📎</span>
              <span className="card-badge-text">{card.attachments.length}</span>
            </div>
          )}
        </div>

        <button
          className="card-delete-button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
        >
          &times;
        </button>
      </div>

      {isModalOpen && (
        <CardModal
          card={card}
          listId={listId}
          listTitle={listTitle}
          onClose={() => setIsModalOpen(false)}
          onUpdateCard={onUpdateCard}
        />
      )}
    </>
  );
};

export default Card;
