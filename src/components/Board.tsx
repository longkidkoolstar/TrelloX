import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Board as BoardType, List as ListType, Card as CardType } from '../types';
import List from './List';
import { DragCard, DragList } from './DragOverlays';
import './Board.css';

interface BoardProps {
  board: BoardType;
  onUpdateBoard: (updatedBoard: BoardType) => void;
}

const Board: React.FC<BoardProps> = ({ board, onUpdateBoard }) => {
  const [lists, setLists] = useState<ListType[]>(board.lists);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'list' | 'card' | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);

  // Update the board when lists change
  useEffect(() => {
    onUpdateBoard({
      ...board,
      lists
    });
  }, [lists]);

  // Update local lists when board changes
  useEffect(() => {
    setLists(board.lists);
  }, [board.id]);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find a card by its ID across all lists
  const findCardById = (cardId: string) => {
    for (const list of lists) {
      const card = list.cards.find(card => card.id === cardId);
      if (card) {
        return { card, listId: list.id };
      }
    }
    return null;
  };

  // Find a list by its ID
  const findListById = (listId: string) => {
    return lists.find(list => list.id === listId) || null;
  };

  // Handle the start of a drag operation
  const handleDragStart = (event: any) => {
    const { active } = event;
    const activeId = active.id;

    // Determine if we're dragging a list or a card
    if (activeId.startsWith('list-')) {
      setActiveType('list');
      const activeList = findListById(activeId);
      setActiveItem(activeList);
    } else {
      setActiveType('card');
      const activeCardData = findCardById(activeId);
      if (activeCardData) {
        setActiveItem(activeCardData.card);
      }
    }

    setActiveId(activeId);
  };

  // Handle the end of a drag operation
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      setActiveItem(null);
      return;
    }

    // If the item was dropped in the same position, do nothing
    if (active.id === over.id) {
      setActiveId(null);
      setActiveType(null);
      setActiveItem(null);
      return;
    }

    // Handle list reordering
    if (activeType === 'list') {
      const oldIndex = lists.findIndex(list => list.id === active.id);
      const newIndex = lists.findIndex(list => list.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newLists = arrayMove(lists, oldIndex, newIndex);
        setLists(newLists);
      }
    }

    setActiveId(null);
    setActiveType(null);
    setActiveItem(null);
  };

  // Handle when a card is dragged over a different container (list)
  const handleDragOver = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Only handle card dragging here
    if (activeType !== 'card') return;

    const activeCardData = findCardById(active.id);
    if (!activeCardData) return;

    const { listId: sourceListId } = activeCardData;

    // If over a list, we're dragging to the end of that list
    let destinationListId = over.id;
    let destinationIndex = 0;

    // If over a card, we need to find which list it belongs to
    if (over.id.startsWith('card-')) {
      const overCardData = findCardById(over.id);
      if (!overCardData) return;

      destinationListId = overCardData.listId;
      const destinationList = findListById(destinationListId);
      if (!destinationList) return;

      destinationIndex = destinationList.cards.findIndex(card => card.id === over.id);
      if (destinationIndex === -1) return;
    }

    // If we're not changing lists or position, do nothing
    if (sourceListId === destinationListId) {
      const sourceList = findListById(sourceListId);
      if (!sourceList) return;

      const sourceIndex = sourceList.cards.findIndex(card => card.id === active.id);
      if (sourceIndex === destinationIndex) return;

      // Reorder within the same list
      const newLists = [...lists];
      const listIndex = newLists.findIndex(list => list.id === sourceListId);
      if (listIndex === -1) return;

      const newCards = arrayMove(
        newLists[listIndex].cards,
        sourceIndex,
        destinationIndex
      );

      newLists[listIndex] = {
        ...newLists[listIndex],
        cards: newCards
      };

      setLists(newLists);
    } else {
      // Moving from one list to another
      const newLists = [...lists];
      const sourceListIndex = newLists.findIndex(list => list.id === sourceListId);
      const destListIndex = newLists.findIndex(list => list.id === destinationListId);

      if (sourceListIndex === -1 || destListIndex === -1) return;

      // Get the card being moved
      const sourceList = newLists[sourceListIndex];
      const sourceIndex = sourceList.cards.findIndex(card => card.id === active.id);
      if (sourceIndex === -1) return;

      const [movedCard] = sourceList.cards.splice(sourceIndex, 1);
      newLists[destListIndex].cards.splice(destinationIndex, 0, movedCard);

      setLists(newLists);
    }
  };

  const handleAddList = () => {
    if (newListTitle.trim()) {
      const newList: ListType = {
        id: `list-${uuidv4()}`,
        title: newListTitle,
        cards: [],
      };
      setLists([...lists, newList]);
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  const handleAddCard = (listId: string, content: string) => {
    const newCard: CardType = {
      id: `card-${uuidv4()}`,
      content,
      description: '',
      labels: [],
      comments: [],
      attachments: [],
      checklists: [],
      createdAt: '',
      createdBy: ''
    };

    const newLists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          cards: [...list.cards, newCard],
        };
      }
      return list;
    });

    setLists(newLists);
  };

  const handleDeleteCard = (listId: string, cardId: string) => {
    const newLists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          cards: list.cards.filter((card) => card.id !== cardId),
        };
      }
      return list;
    });

    setLists(newLists);
  };

  const handleDeleteList = (listId: string) => {
    setLists(lists.filter((list) => list.id !== listId));
  };

  const handleEditListTitle = (listId: string, newTitle: string) => {
    const newLists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          title: newTitle,
        };
      }
      return list;
    });

    setLists(newLists);
  };

  const handleUpdateCard = (listId: string, cardId: string, updatedCard: Partial<CardType>) => {
    const newLists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          cards: list.cards.map((card) => {
            if (card.id === cardId) {
              return {
                ...card,
                ...updatedCard
              };
            }
            return card;
          }),
        };
      }
      return list;
    });

    setLists(newLists);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddList();
    }
  };

  return (
    <div
      className="board"
      style={{
        backgroundColor: board.backgroundImage ? 'transparent' : board.backgroundColor || '#0079bf',
        backgroundImage: board.backgroundImage ? `url(${board.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-lists">
          <SortableContext
            items={lists.map(list => list.id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list, index) => (
              <List
                key={list.id}
                list={list}
                index={index}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onDeleteList={handleDeleteList}
                onEditListTitle={handleEditListTitle}
                onUpdateCard={handleUpdateCard}
              />
            ))}
          </SortableContext>

          {isAddingList ? (
            <div className="add-list-form">
              <input
                type="text"
                className="add-list-input"
                placeholder="Enter list title..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="add-list-actions">
                <button className="add-list-button" onClick={handleAddList}>
                  Add List
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListTitle('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="add-list-toggle"
              onClick={() => setIsAddingList(true)}
            >
              + Add another list
            </button>
          )}
        </div>

        <DragOverlay>
          {activeItem && activeType === 'card' && (
            <DragCard card={activeItem} />
          )}
          {activeItem && activeType === 'list' && (
            <DragList list={activeItem} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Board;
