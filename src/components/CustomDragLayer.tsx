import React from 'react';
import { useDragLayer, XYCoord } from 'react-dnd';
import { ItemTypes } from './DragTypes';
import { Card as CardType, List as ListType } from '../types';
import './CustomDragLayer.css';

interface CustomDragLayerProps {
  lists: ListType[];
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ lists }) => {
  const { itemType, isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset || !initialOffset) {
    return null;
  }

  const getItemStyles = (_initialOffset: XYCoord, currentOffset: XYCoord) => {
    const { x, y } = currentOffset;
    const transform = `translate(${x}px, ${y}px)`;
    return {
      transform,
      WebkitTransform: transform,
      zIndex: 9999,
    };
  };

  const renderItem = () => {
    switch (itemType) {
      case ItemTypes.CARD:
        const cardList = lists.find(list => list.id === item.listId);
        if (!cardList) return null;

        const card = cardList.cards.find(c => c.id === item.id);
        if (!card) return null;

        return <CardDragPreview card={card} />;

      case ItemTypes.LIST:
        const list = lists.find(l => l.id === item.id);
        if (!list) return null;

        return <ListDragPreview list={list} />;

      default:
        return null;
    }
  };

  return (
    <div className="custom-drag-layer">
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
};

interface CardDragPreviewProps {
  card: CardType;
}

const CardDragPreview: React.FC<CardDragPreviewProps> = ({ card }) => {
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

  return (
    <div className="drag-card-preview">
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
    </div>
  );
};

interface ListDragPreviewProps {
  list: ListType;
}

const ListDragPreview: React.FC<ListDragPreviewProps> = ({ list }) => {
  return (
    <div className="drag-list-preview">
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

export default CustomDragLayer;
