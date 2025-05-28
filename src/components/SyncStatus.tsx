import React, { useState, useEffect } from 'react';
import './SyncStatus.css';

interface SyncStatusProps {
  isUpdating: boolean;
  lastSyncTime?: Date;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isUpdating, lastSyncTime }) => {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (isUpdating) {
      setShowStatus(true);
    } else {
      // Hide status after a short delay when sync completes
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isUpdating]);

  if (!showStatus) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`sync-status ${isUpdating ? 'syncing' : 'synced'}`}>
      <div className="sync-icon">
        {isUpdating ? (
          <i className="fas fa-sync-alt spinning"></i>
        ) : (
          <i className="fas fa-check"></i>
        )}
      </div>
      <span className="sync-text">
        {isUpdating ? 'Syncing...' : 
         lastSyncTime ? `Synced ${formatTime(lastSyncTime)}` : 'Synced'}
      </span>
    </div>
  );
};

export default SyncStatus;
