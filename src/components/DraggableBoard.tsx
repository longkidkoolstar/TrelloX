import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Board as BoardType, List as ListType, Card as CardType } from '../types';
import DraggableList from './DraggableList';
import CustomDragLayer from './CustomDragLayer';
import './Board.css';

interface DraggableBoardProps {
  board: BoardType;
  onUpdateBoard: (updatedBoard: BoardType) => void;
}

const DraggableBoard: React.FC<DraggableBoardProps> = ({ board, onUpdateBoard }) => {
  const [lists, setLists] = useState<ListType[]>(board.lists);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

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

  const moveList = (dragIndex: number, hoverIndex: number) => {
    const draggedList = lists[dragIndex];
    const newLists = [...lists];
    newLists.splice(dragIndex, 1);
    newLists.splice(hoverIndex, 0, draggedList);
    setLists(newLists);
  };

  const moveCard = (
    dragIndex: number,
    hoverIndex: number,
    sourceListId: string,
    targetListId: string
  ) => {
    // Find source and target lists
    const sourceListIndex = lists.findIndex(list => list.id === sourceListId);
    const targetListIndex = lists.findIndex(list => list.id === targetListId);
    
    if (sourceListIndex === -1 || targetListIndex === -1) return;
    
    const newLists = [...lists];
    const sourceList = { ...newLists[sourceListIndex] };
    const targetList = sourceListId === targetListId 
      ? sourceList 
      : { ...newLists[targetListIndex] };
    
    // Get the card being moved
    const [movedCard] = sourceList.cards.splice(dragIndex, 1);
    
    // Insert the card at the new position
    if (sourceListId === targetListId) {
      // Moving within the same list
      sourceList.cards.splice(hoverIndex, 0, movedCard);
      newLists[sourceListIndex] = sourceList;
    } else {
      // Moving to a different list
      targetList.cards.splice(hoverIndex, 0, movedCard);
      newLists[sourceListIndex] = sourceList;
      newLists[targetListIndex] = targetList;
    }
    
    setLists(newLists);
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
      createdAt: new Date().toISOString(),
      createdBy: 'current-user',
      checklists: []
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
    <div className="board" style={{ backgroundColor: board.backgroundColor || '#0079bf' }}>
      <CustomDragLayer lists={lists} />
      
      <div className="board-lists">
        {lists.map((list, index) => (
          <DraggableList
            key={list.id}
            list={list}
            index={index}
            moveList={moveList}
            moveCard={moveCard}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
            onDeleteList={handleDeleteList}
            onEditListTitle={handleEditListTitle}
            onUpdateCard={handleUpdateCard}
          />
        ))}

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
    </div>
  );
};

export default DraggableBoard;
