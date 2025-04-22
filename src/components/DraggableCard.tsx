import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypes, CardDragItem } from './DragTypes';
import { Card as CardType } from '../types';
import CardModal from './CardModal';
import { useModalContext } from '../context/ModalContext';
import './Card.css';

interface DraggableCardProps {
  card: CardType;
  index: number;
  listId: string;
  listTitle: string;
  moveCard: (dragIndex: number, hoverIndex: number, sourceListId: string, targetListId: string) => void;
  onDelete: (cardId: string) => void;
  onUpdateCard: (listId: string, cardId: string, updatedCard: Partial<CardType>) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  index,
  listId,
  listTitle,
  moveCard,
  onDelete,
  onUpdateCard
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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

  // Configure drag
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: {
      type: ItemTypes.CARD,
      id: card.id,
      index,
      listId,
      content: card.content
    } as CardDragItem,
    canDrag: !isAnyModalOpen, // Disable dragging when any modal is open
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, monitor) => {
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        // Card was not dropped on a valid target
        // You could implement a "return to original position" animation here
      }
    },
  });

  // Configure drop
  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    canDrop: () => !isAnyModalOpen, // Disable dropping when any modal is open
    hover: (item: CardDragItem, monitor) => {
      // If a modal is open, don't allow hover interactions
      if (isAnyModalOpen) return;
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;
      const sourceListId = item.listId;
      const targetListId = listId;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex && sourceListId === targetListId) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveCard(dragIndex, hoverIndex, sourceListId, targetListId);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
      item.listId = targetListId;
    },
  });

  // Connect the drag and drop refs
  drag(drop(ref));

  return (
    <>
      <div
        ref={ref}
        className="card"
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: isDragging ? 'grabbing' : 'grab',
          visibility: isDragging ? 'hidden' : 'visible'
        }}
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
                {(() => {
                  const totals = card.checklists.reduce((acc, checklist) => {
                    const completed = checklist.items.filter(item => item.state === 'complete').length;
                    const total = checklist.items.length;
                    return {
                      completed: acc.completed + completed,
                      total: acc.total + total
                    };
                  }, { completed: 0, total: 0 });
                  return `${totals.completed}/${totals.total}`;
                })()}
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

export default DraggableCard;

