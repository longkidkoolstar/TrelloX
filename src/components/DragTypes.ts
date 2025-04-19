// Define item types for drag and drop
export const ItemTypes = {
  CARD: 'card',
  LIST: 'list',
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
