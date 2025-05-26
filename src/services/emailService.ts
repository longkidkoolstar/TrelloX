import emailjs from '@emailjs/browser';
import { BoardPermission } from '../types';

// Email configuration - these should be set in environment variables
const EMAIL_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
};

// Check if email service is configured
export const isEmailConfigured = (): boolean => {
  return !!(EMAIL_CONFIG.SERVICE_ID && EMAIL_CONFIG.TEMPLATE_ID && EMAIL_CONFIG.PUBLIC_KEY);
};

// Get permission description for email
const getPermissionDescription = (permission: BoardPermission): string => {
  switch (permission) {
    case 'owner':
      return 'Full access to the board and can manage members';
    case 'admin':
      return 'Can edit board content and manage members';
    case 'member':
      return 'Can view and edit board content (lists, cards, etc.)';
    case 'viewer':
      return 'Can only view board content (read-only access)';
    default:
      return 'Can view and edit board content';
  }
};

// Send board sharing notification email
export const sendBoardSharingNotification = async (
  recipientEmail: string,
  recipientName: string,
  boardTitle: string,
  sharedByName: string,
  sharedByEmail: string,
  permission: BoardPermission,
  boardUrl: string
): Promise<boolean> => {
  // Check if email service is configured
  if (!isEmailConfigured()) {
    console.warn('Email service not configured. Skipping email notification.');
    return false;
  }

  try {
    // Initialize EmailJS with public key
    emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);

    // Prepare email template parameters
    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientName || recipientEmail,
      from_name: sharedByName || 'Someone',
      from_email: sharedByEmail,
      board_title: boardTitle,
      board_url: boardUrl,
      permission_level: permission.charAt(0).toUpperCase() + permission.slice(1),
      permission_description: getPermissionDescription(permission),
      app_name: 'TrelloX',
      message: `${sharedByName || 'Someone'} has invited you to collaborate on the board "${boardTitle}" in TrelloX.`,
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log('Email notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
};


