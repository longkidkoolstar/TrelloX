import React, { useState, useEffect } from 'react';
import { BoardPresence, UserPresence } from '../types';
import { getCurrentUser } from '../firebase/auth';
import { presenceService } from '../services/presenceService';
import './PresenceIndicators.css';

interface PresenceIndicatorsProps {
  boardId: string;
  maxVisible?: number; // Maximum number of avatars to show before showing "+X more"
}

const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({ 
  boardId, 
  maxVisible = 5 
}) => {
  const [presence, setPresence] = useState<BoardPresence>({});
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    if (!boardId) return;

    // Subscribe to presence updates
    const unsubscribe = presenceService.subscribeToPresence(boardId, (newPresence) => {
      setPresence(newPresence);
    });

    return () => {
      unsubscribe();
    };
  }, [boardId]);

  // Filter out current user and get active users
  const activeUsers = Object.values(presence).filter(
    user => user.userId !== currentUser?.uid && user.isActive
  );

  // Don't show anything if no other users are present
  if (activeUsers.length === 0) {
    return null;
  }

  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  const formatLastSeen = (lastSeen: string): string => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Active now';
    if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
  };

  const getUserInitials = (user: UserPresence): string => {
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="presence-indicators">
      <div className="presence-avatars">
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className="presence-avatar"
            title={`${user.displayName || user.email} - ${formatLastSeen(user.lastSeen)}`}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || user.email}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-initials">
                {getUserInitials(user)}
              </div>
            )}
            <div className="presence-indicator active"></div>
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div 
            className="presence-avatar more-users"
            title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''} active`}
          >
            <div className="avatar-initials">
              +{hiddenCount}
            </div>
            <div className="presence-indicator active"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceIndicators;
