import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType, Label, Checklist } from '../types';
import CardModal from './CardModal';
import { useModalContext } from '../context/ModalContext';
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
  const { isModalOpen: isAnyModalOpen, openModal, closeModal } = useModalContext();

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
    data: { type: 'card', card, listId },
    disabled: isAnyModalOpen // Disable dragging when any modal is open
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
        onClick={() => {
          setIsModalOpen(true);
          openModal();
        }}
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

          {card.checklists && card.checklists.length > 0 && (
            <div className="card-badge">
              <span className="card-badge-icon">✓</span>
              <span className="card-badge-text">
                {card.checklists.reduce((count, checklist) => {
                  const completed = checklist.items.filter(item => item.state === 'complete').length;
                  const total = checklist.items.length;
                  return `${count + completed}/${count + total}`;
                }, 0)}
              </span>
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
          onClose={() => {
            setIsModalOpen(false);
            closeModal();
          }}
          onUpdateCard={onUpdateCard}
        />
      )}
    </>
  );
};

export default Card;
