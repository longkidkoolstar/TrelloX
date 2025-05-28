import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Board as BoardType, List as ListType, Card as CardType, StickyNote as StickyNoteType, BoardMember } from '../types';
import DraggableList from './DraggableList';
import CustomDragLayer from './CustomDragLayer';
import StickyNote from './StickyNote';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { ItemTypes } from './DragTypes';
import { useDrop } from 'react-dnd';
import { getCurrentUser } from '../firebase/auth';
import { getUserProfiles, migrateBoardMembers, migrateStickyNotes } from '../firebase/firestore';
import './Board.css';

interface DraggableBoardProps {
  board: BoardType;
  onUpdateBoard: (updatedBoard: BoardType) => void;
}

const DraggableBoard: React.FC<DraggableBoardProps> = ({ board, onUpdateBoard }) => {
  const [lists, setLists] = useState<ListType[]>(board.lists);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteType[]>(board.stickyNotes || []);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false); // Track if update is from local user
  const boardRef = useRef<HTMLDivElement>(null);

  // Backwards compatibility: Build board members from members array if boardMembers is missing
  useEffect(() => {
    const buildBoardMembers = async () => {
      if (board.boardMembers && board.boardMembers.length > 0) {
        // Use existing boardMembers if available
        setBoardMembers(board.boardMembers);
      } else if (board.members && board.members.length > 0) {
        // Backwards compatibility: Build boardMembers from members array
        try {
          // Attempt to migrate the board data in Firestore for future use
          await migrateBoardMembers(board.id);
          await migrateStickyNotes(board.id);

          const userProfiles = await getUserProfiles(board.members);
          const constructedBoardMembers: BoardMember[] = userProfiles.map(user => ({
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            permission: user.uid === board.createdBy ? 'owner' : 'member',
            joinedAt: user.uid === board.createdBy ? board.createdAt : new Date().toISOString()
          }));
          setBoardMembers(constructedBoardMembers);
        } catch (error) {
          console.error('Error building board members for backwards compatibility:', error);
          setBoardMembers([]);
        }
      } else {
        setBoardMembers([]);
      }
    };

    buildBoardMembers();
  }, [board.boardMembers, board.members, board.createdBy, board.createdAt, board.id]);

  // Update the board when lists or sticky notes change (only for local updates)
  useEffect(() => {
    if (isLocalUpdate) {
      onUpdateBoard({
        ...board,
        lists,
        stickyNotes
      });

      // Reset the flag after update
      setTimeout(() => setIsLocalUpdate(false), 100);
    }
  }, [lists, stickyNotes, isLocalUpdate]);

  // Update local lists and sticky notes when board changes from real-time updates
  useEffect(() => {
    // Only update if this is a real-time update (not a local update)
    if (!isLocalUpdate) {
      setLists(board.lists);
      setStickyNotes(board.stickyNotes || []);
    }
  }, [board.lists, board.stickyNotes, board.id, isLocalUpdate]);

  const moveList = (dragIndex: number, hoverIndex: number) => {
    const draggedList = lists[dragIndex];
    const newLists = [...lists];
    newLists.splice(dragIndex, 1);
    newLists.splice(hoverIndex, 0, draggedList);
    setIsLocalUpdate(true);
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

    setIsLocalUpdate(true);
    setLists(newLists);
  };

  const handleAddList = () => {
    if (newListTitle.trim()) {
      const newList: ListType = {
        id: `list-${uuidv4()}`,
        title: newListTitle,
        cards: [],
      };
      setIsLocalUpdate(true);
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

    setIsLocalUpdate(true);
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

    setIsLocalUpdate(true);
    setLists(newLists);
  };

  const handleDeleteList = (listId: string) => {
    setIsLocalUpdate(true);
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

    setIsLocalUpdate(true);
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

    setIsLocalUpdate(true);
    setLists(newLists);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddList();
    }
  };

  // Handle right-click on the board to show context menu
  const handleBoardContextMenu = (e: React.MouseEvent) => {
    // Only show context menu if clicking on the board background, not on lists or cards
    const target = e.target as HTMLElement;
    if (target.classList.contains('board') || target.classList.contains('board-lists')) {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  // Add a new sticky note at the clicked position
  const handleAddStickyNote = () => {
    const user = getCurrentUser();
    if (!user) return;

    // Calculate position relative to the board
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    // Adjust position to be relative to the board
    const x = contextMenuPosition.x - boardRect.left;
    const y = contextMenuPosition.y - boardRect.top;

    // Generate a random rotation between -5 and 5 degrees
    const rotation = Math.floor(Math.random() * 10) - 5;

    // Create a new sticky note
    const newStickyNote: StickyNoteType = {
      id: `sticky-${uuidv4()}`,
      content: 'New sticky note',
      color: 'yellow',
      position: { x, y },
      rotation,
      createdAt: new Date().toISOString(),
      createdBy: user.uid
    };

    setIsLocalUpdate(true);
    setStickyNotes([...stickyNotes, newStickyNote]);
  };

  // Update a sticky note
  const handleUpdateStickyNote = (noteId: string, updatedNote: Partial<StickyNoteType>) => {
    const newStickyNotes = stickyNotes.map(note => {
      if (note.id === noteId) {
        return { ...note, ...updatedNote };
      }
      return note;
    });

    setIsLocalUpdate(true);
    setStickyNotes(newStickyNotes);
  };

  // Delete a sticky note
  const handleDeleteStickyNote = (noteId: string) => {
    setIsLocalUpdate(true);
    setStickyNotes(stickyNotes.filter(note => note.id !== noteId));
  };

  // Configure drop for sticky notes
  const [, drop] = useDrop({
    accept: ItemTypes.STICKY_NOTE,
    drop: (item: { id: string }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;

      const note = stickyNotes.find(n => n.id === item.id);
      if (!note) return;

      const newPosition = {
        x: note.position.x + delta.x,
        y: note.position.y + delta.y
      };

      handleUpdateStickyNote(item.id, { position: newPosition });
      return undefined;
    }
  });

  // Determine the background style based on available background properties
  let boardStyle = {};

  if (board.backgroundImage) {
    // If we have a background image, use it
    boardStyle = {
      backgroundImage: `url(${board.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  } else if (board.backgroundColor && board.backgroundColor.startsWith('linear-gradient')) {
    // If we have a gradient background
    boardStyle = {
      backgroundImage: board.backgroundColor,
      backgroundSize: 'cover'
    };
  } else {
    // Default to solid color background
    boardStyle = {
      backgroundColor: board.backgroundColor || '#0079bf'
    };
  }

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'Add Sticky Note',
      icon: '📝',
      onClick: handleAddStickyNote,
    }
  ];

  return (
    <div
      className="board"
      style={boardStyle}
      ref={(node) => {
        boardRef.current = node;
        drop(node);
      }}
      onContextMenu={handleBoardContextMenu}
    >
      <CustomDragLayer lists={lists} stickyNotes={stickyNotes} />

      {/* Sticky Notes */}
      {stickyNotes.map(note => (
        <StickyNote
          key={note.id}
          note={note}
          onUpdate={handleUpdateStickyNote}
          onDelete={handleDeleteStickyNote}
          boardMembers={boardMembers}
        />
      ))}

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

      {/* Context Menu */}
      {showContextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
};

export default DraggableBoard;
