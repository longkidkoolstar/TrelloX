import React from 'react';
import { Card as CardType, List as ListType } from '../types';
import './DragOverlays.css';

interface DragCardProps {
  card: CardType;
}

interface DragListProps {
  list: ListType;
}

export const DragCard: React.FC<DragCardProps> = ({ card }) => {
  return (
    <div className="drag-card">
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
        {card.dueDate && (
          <div className={`card-due-date ${new Date(card.dueDate) < new Date() ? 'past-due' : ''}`}>
            <span className="due-date-icon">🕒</span>
            <span className="due-date-text">
              {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
        
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
    </div>
  );
};

export const DragList: React.FC<DragListProps> = ({ list }) => {
  return (
    <div className="drag-list">
      <div className="list-header">
        <h2 className="list-title">{list.title}</h2>
      </div>
      <div className="list-cards-preview">
        {list.cards.slice(0, 3).map(card => (
          <div key={card.id} className="card-preview">
            {card.content}
          </div>
        ))}
        {list.cards.length > 3 && (
          <div className="card-preview-more">
            +{list.cards.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
};
