// Define item types for drag and drop
export const ItemTypes = {
  CARD: 'card',
  LIST: 'list',
  STICKY_NOTE: 'sticky-note',
};

// Define interfaces for draggable items
export interface DragItem {
  type: string;
  id: string;
  index: number;
}

export interface CardDragItem extends DragItem {
  type: typeof ItemTypes.CARD;
  listId: string;
  content: string;
}

export interface ListDragItem extends DragItem {
  type: typeof ItemTypes.LIST;
  title: string;
}

export interface StickyNoteDragItem extends DragItem {
  type: typeof ItemTypes.STICKY_NOTE;
  position: { x: number; y: number };
}
