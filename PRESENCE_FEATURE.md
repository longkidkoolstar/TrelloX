# Real-time Presence Indicators Feature

## Overview
The Real-time Presence Indicators feature shows which users are currently active on a board, similar to Google Docs. This provides visual feedback about who is collaborating in real-time.

## Features Implemented

### 1. **Real-time Presence Tracking**
- **Location**: `src/services/presenceService.ts`
- **Purpose**: Manages user presence detection and real-time updates
- **Features**:
  - Automatic presence detection when users join/leave boards
  - Heartbeat mechanism to keep presence alive (30-second intervals)
  - Activity detection (mouse, keyboard, scroll, touch events)
  - Page visibility tracking (marks users as away when tab is hidden)
  - Automatic cleanup when users navigate away or sign out

### 2. **Presence Indicators UI**
- **Location**: `src/components/PresenceIndicators.tsx`
- **Purpose**: Displays active users with avatars and status indicators
- **Features**:
  - User avatars with green activity indicators
  - Hover tooltips showing user names and last activity
  - Initials fallback for users without profile photos
  - "+X more" indicator when many users are present
  - Responsive design for mobile devices

### 3. **Visual Design**
- **Location**: `src/components/PresenceIndicators.css`
- **Purpose**: Styling for presence indicators
- **Features**:
  - Overlapping avatar layout (similar to Google Docs)
  - Animated green pulse for active users
  - Smooth hover animations and scaling
  - Dark mode support
  - Professional tooltip styling

## Technical Implementation

### Database Structure
```
boardPresence/{boardId}/users/{userId}
├── userId: string
├── email: string
├── displayName?: string
├── photoURL?: string
├── lastSeen: Timestamp
├── isActive: boolean
└── boardId: string
```

### Key Components
1. **PresenceService**: Core presence management with heartbeat
2. **PresenceIndicators**: UI component for displaying active users
3. **App.tsx**: Integration and lifecycle management
4. **Header.tsx**: Placement of presence indicators

### Real-time Updates
- Uses Firestore `onSnapshot` listeners for real-time presence updates
- Automatic cleanup of stale presence data (users offline > 2 minutes)
- Efficient updates only when presence data actually changes

## User Experience

### Visual Indicators
- **Green dot with pulse**: User is actively using the board
- **Avatar overlap**: Space-efficient display of multiple users
- **Hover tooltips**: Show user details and last activity time
- **Responsive count**: Shows "+X more" when many users are present

### Activity Detection
- **Active**: User is interacting with the page (mouse, keyboard, etc.)
- **Away**: User's tab is hidden or no recent activity
- **Offline**: User hasn't been seen for more than 2 minutes

### Privacy & Security
- Only shows presence to board members
- Respects existing board permission system
- No sensitive data exposed in presence information
- Automatic cleanup prevents data accumulation

## Integration Points

### Header Integration
- Presence indicators appear between board selector and share button
- Only visible when a board is selected and has multiple members
- Seamlessly integrates with existing header styling

### Authentication Integration
- Automatically starts/stops presence tracking based on auth state
- Uses existing user profile data (name, email, photo)
- Respects user permissions and board access

### Board Sharing Integration
- Works with existing board sharing and collaboration features
- Presence updates automatically when members are added/removed
- Integrates with board permission system

## Performance Considerations

### Efficient Updates
- Heartbeat every 30 seconds (not too frequent)
- Only updates when user activity changes
- Automatic cleanup of inactive users

### Scalability
- Presence data is scoped to individual boards
- Uses Firestore subcollections for efficient querying
- Minimal data transfer (only essential presence info)

### Resource Management
- Proper cleanup on component unmount
- Event listener cleanup to prevent memory leaks
- Automatic presence removal on page unload

## Future Enhancements

### Planned Features
1. **Cursor Tracking**: Show real-time cursor positions
2. **Activity Indicators**: Show what users are currently editing
3. **Presence History**: Track when users were last active
4. **Custom Status**: Allow users to set custom status messages
5. **Presence Notifications**: Notify when specific users join/leave

### Advanced Features
1. **Voice/Video Integration**: Connect with communication tools
2. **Screen Sharing**: Share screens during collaboration
3. **Collaborative Editing**: Real-time card/list editing indicators
4. **Presence Analytics**: Track collaboration patterns

## Testing

### Manual Testing
1. Open the same board in multiple browser tabs/windows
2. Sign in with different users
3. Verify presence indicators appear for other users
4. Test activity detection by switching tabs
5. Verify cleanup when users sign out or navigate away

### Automated Testing
- Unit tests for PresenceService functionality
- Integration tests for real-time updates
- Performance tests for multiple concurrent users

## Troubleshooting

### Common Issues
1. **Presence not showing**: Check Firestore rules and authentication
2. **Stale presence**: Verify heartbeat mechanism is working
3. **Performance issues**: Check for memory leaks in event listeners
4. **Permission errors**: Ensure user has board access

### Debug Tools
- Browser console logs for presence service activity
- Firestore console to view presence data
- Network tab to monitor real-time listener connections

## Files Modified/Created

### New Files
- `src/services/presenceService.ts` - Core presence management
- `src/components/PresenceIndicators.tsx` - UI component
- `src/components/PresenceIndicators.css` - Styling
- `PRESENCE_FEATURE.md` - This documentation

### Modified Files
- `src/types.ts` - Added UserPresence and BoardPresence interfaces
- `src/components/Header.tsx` - Integrated presence indicators
- `src/App.tsx` - Added presence lifecycle management
- `firestore.rules` - Added presence security rules
