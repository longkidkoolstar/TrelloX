import React, { useState, useEffect } from 'react';
import { Board, BoardMember, BoardPermission, User } from '../types';
import {
  getBoardMembers,
  addMemberToBoard,
  removeMemberFromBoard,
  updateMemberPermission,
  searchUsersByEmail
} from '../firebase/firestore';
import { getCurrentUser } from '../firebase/auth';
import { sendBoardSharingNotification, isEmailConfigured } from '../services/emailService';
import './BoardSharingModal.css';

interface BoardSharingModalProps {
  board: Board;
  onClose: () => void;
  onBoardUpdate: (updatedBoard: Board) => void;
}

const BoardSharingModal: React.FC<BoardSharingModalProps> = ({
  board,
  onClose,
  onBoardUpdate
}) => {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUser = getCurrentUser();

  // Load board members on component mount
  useEffect(() => {
    loadBoardMembers();
  }, [board.id]);

  // Search users when email input changes
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchEmail.trim() && searchEmail.includes('@')) {
        handleSearchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchEmail]);

  const loadBoardMembers = async () => {
    try {
      setIsLoading(true);
      const boardMembers = await getBoardMembers(board.id);
      setMembers(boardMembers);
    } catch (err: any) {
      setError(err.message || 'Failed to load board members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    try {
      setIsSearching(true);
      const users = await searchUsersByEmail(searchEmail);

      // Filter out users who are already members
      const memberEmails = members.map(member => member.email);
      const filteredUsers = users.filter(user => !memberEmails.includes(user.email));

      setSearchResults(filteredUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userEmail: string, permission: BoardPermission = 'member') => {
    try {
      setError(null);
      setSuccessMessage(null);

      await addMemberToBoard(board.id, userEmail, permission);

      // Reload members to get the updated list
      await loadBoardMembers();

      // Get the updated board data from Firestore and refresh parent
      const { getBoardById } = await import('../firebase/firestore');
      const updatedBoard = await getBoardById(board.id);
      if (updatedBoard) {
        onBoardUpdate(updatedBoard);
      }

      // Don't clear search immediately - let user add multiple members
      // Only remove the added user from search results
      setSearchResults(prev => prev.filter(user => user.email !== userEmail));

      // Send email notification
      if (isEmailConfigured()) {
        try {
          const currentUserData = getCurrentUser();
          const boardUrl = `${window.location.origin}/?board=${board.id}`;

          await sendBoardSharingNotification(
            userEmail,
            userEmail, // We'll use email as name if displayName not available
            board.title,
            currentUserData?.displayName || currentUserData?.email || 'Someone',
            currentUserData?.email || '',
            permission,
            boardUrl
          );

          setSuccessMessage(`Successfully added ${userEmail} to the board and sent email notification`);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          setSuccessMessage(`Successfully added ${userEmail} to the board (email notification failed)`);
        }
      } else {
        setSuccessMessage(`Successfully added ${userEmail} to the board`);
      }

      // Auto-clear success message
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from this board?`)) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      await removeMemberFromBoard(board.id, userId);

      // Reload members and refresh the board data
      await loadBoardMembers();

      // Get the updated board data from Firestore and refresh parent
      const { getBoardById } = await import('../firebase/firestore');
      const updatedBoard = await getBoardById(board.id);
      if (updatedBoard) {
        onBoardUpdate(updatedBoard);
      }

      setSuccessMessage(`Successfully removed ${userEmail} from the board`);

      // Auto-clear success message
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: BoardPermission) => {
    try {
      setError(null);
      setSuccessMessage(null);

      await updateMemberPermission(board.id, userId, newPermission);

      // Reload members and refresh the board data
      await loadBoardMembers();

      // Get the updated board data from Firestore and refresh parent
      const { getBoardById } = await import('../firebase/firestore');
      const updatedBoard = await getBoardById(board.id);
      if (updatedBoard) {
        onBoardUpdate(updatedBoard);
      }

      setSuccessMessage('Permission updated successfully');

      // Auto-clear success message
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to update permission');
    }
  };



  const isOwner = currentUser?.uid === board.createdBy;
  const canManageMembers = isOwner;

  const getPermissionDisplayName = (permission: BoardPermission): string => {
    switch (permission) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'member': return 'Member';
      case 'viewer': return 'Viewer';
      default: return 'Member';
    }
  };

  const getPermissionDescription = (permission: BoardPermission): string => {
    switch (permission) {
      case 'owner': return 'Full access to the board and can manage members';
      case 'admin': return 'Can edit board content and manage members';
      case 'member': return 'Can view and edit board content';
      case 'viewer': return 'Can only view board content';
      default: return 'Can view and edit board content';
    }
  };

  return (
    <div className="board-sharing-modal-overlay" onClick={onClose}>
      <div className="board-sharing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="board-sharing-modal-header">
          <h2>Share Board: {board.title}</h2>
          <button className="board-sharing-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="board-sharing-modal-content">
          {error && (
            <div className="board-sharing-error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="board-sharing-success">
              {successMessage}
            </div>
          )}

          {/* Add Member Section */}
          {canManageMembers && (
            <div className="board-sharing-add-member">
              <h3>Add Member</h3>
              <div className="board-sharing-search">
                <input
                  type="email"
                  placeholder="Enter email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="board-sharing-search-input"
                />
                {searchEmail && (
                  <button
                    onClick={() => {
                      setSearchEmail('');
                      setSearchResults([]);
                    }}
                    className="board-sharing-clear-search"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                {isSearching && <div className="board-sharing-searching">Searching...</div>}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="board-sharing-search-results">
                  {searchResults.map(user => (
                    <div key={user.uid} className="board-sharing-search-result">
                      <div className="board-sharing-user-info">
                        {user.photoURL && (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || user.email}
                            className="board-sharing-user-avatar"
                          />
                        )}
                        <div>
                          <div className="board-sharing-user-name">
                            {user.displayName || user.email}
                          </div>
                          <div className="board-sharing-user-email">{user.email}</div>
                        </div>
                      </div>
                      <div className="board-sharing-add-actions">
                        <select
                          className="board-sharing-permission-select"
                          onChange={(e) => {
                            const permission = e.target.value as BoardPermission;
                            handleAddMember(user.email, permission);
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Add as...</option>
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                          {isOwner && <option value="admin">Admin</option>}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Members Section */}
          <div className="board-sharing-members">
            <h3>Board Members ({members.length})</h3>

            {isLoading ? (
              <div className="board-sharing-loading">Loading members...</div>
            ) : (
              <div className="board-sharing-members-list">
                {members.map(member => (
                  <div key={member.userId} className="board-sharing-member">
                    <div className="board-sharing-member-info">
                      {member.photoURL && (
                        <img
                          src={member.photoURL}
                          alt={member.displayName || member.email}
                          className="board-sharing-member-avatar"
                        />
                      )}
                      <div>
                        <div className="board-sharing-member-name">
                          {member.displayName || member.email}
                          {member.userId === currentUser?.uid && ' (You)'}
                        </div>
                        <div className="board-sharing-member-email">{member.email}</div>
                        <div className="board-sharing-member-joined">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="board-sharing-member-actions">
                      {canManageMembers && member.userId !== board.createdBy ? (
                        <>
                          <select
                            value={member.permission}
                            onChange={(e) => handleUpdatePermission(member.userId, e.target.value as BoardPermission)}
                            className="board-sharing-permission-select"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            {isOwner && <option value="admin">Admin</option>}
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.email)}
                            className="board-sharing-remove-btn"
                            title="Remove member"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <div className="board-sharing-permission-display">
                          <span className={`board-sharing-permission-badge ${member.permission}`}>
                            {getPermissionDisplayName(member.permission)}
                          </span>
                          <div className="board-sharing-permission-desc">
                            {getPermissionDescription(member.permission)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardSharingModal;
