"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.sendTestEmail = exports.onBoardMemberAdded = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const googleapis_1 = require("googleapis");
// Initialize Firebase Admin
admin.initializeApp();
// Gmail API configuration
const OAuth2 = googleapis_1.google.auth.OAuth2;
// Create OAuth2 client
const createOAuth2Client = (config) => {
    const oauth2Client = new OAuth2(config.clientId, config.clientSecret, 'https://developers.google.com/oauthplayground');
    oauth2Client.setCredentials({
        refresh_token: config.refreshToken
    });
    return oauth2Client;
};
// Create nodemailer transporter with Gmail
const createTransporter = async (config) => {
    const oauth2Client = createOAuth2Client(config);
    try {
        const accessToken = await oauth2Client.getAccessToken();
        return nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: config.user,
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: config.refreshToken,
                accessToken: accessToken.token || '',
            },
        });
    }
    catch (error) {
        console.error('Error creating transporter:', error);
        throw error;
    }
};
// Send board sharing notification email
const sendBoardSharingEmail = async (recipientEmail, recipientName, boardTitle, sharedByName, sharedByEmail, permission, boardUrl) => {
    var _a, _b, _c, _d;
    // Get email configuration from environment variables
    const emailConfig = {
        clientId: ((_a = functions.config().gmail) === null || _a === void 0 ? void 0 : _a.client_id) || process.env.GMAIL_CLIENT_ID || '',
        clientSecret: ((_b = functions.config().gmail) === null || _b === void 0 ? void 0 : _b.client_secret) || process.env.GMAIL_CLIENT_SECRET || '',
        refreshToken: ((_c = functions.config().gmail) === null || _c === void 0 ? void 0 : _c.refresh_token) || process.env.GMAIL_REFRESH_TOKEN || '',
        user: ((_d = functions.config().gmail) === null || _d === void 0 ? void 0 : _d.user) || process.env.GMAIL_USER || '',
    };
    // Validate configuration
    if (!emailConfig.clientId || !emailConfig.clientSecret || !emailConfig.refreshToken || !emailConfig.user) {
        console.error('Gmail configuration is incomplete');
        return;
    }
    try {
        const transporter = await createTransporter(emailConfig);
        const mailOptions = {
            from: `TrelloX <${emailConfig.user}>`,
            to: recipientEmail,
            subject: `You've been added to "${boardTitle}" on TrelloX`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Board Invitation - TrelloX</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0079bf; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .board-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0079bf; }
            .permission-badge { display: inline-block; background-color: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .cta-button { display: inline-block; background-color: #0079bf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You've been invited to collaborate!</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName || recipientEmail},</p>
              
              <p><strong>${sharedByName || sharedByEmail}</strong> has invited you to collaborate on a board in TrelloX.</p>
              
              <div class="board-info">
                <h3>📋 ${boardTitle}</h3>
                <p><strong>Shared by:</strong> ${sharedByName || sharedByEmail} (${sharedByEmail})</p>
                <p><strong>Your permission level:</strong> <span class="permission-badge">${permission}</span></p>
                <p><strong>What you can do:</strong></p>
                <ul>
                  ${permission === 'owner' ? '<li>Full access to the board and can manage members</li>' : ''}
                  ${permission === 'admin' ? '<li>Edit board content and manage members</li>' : ''}
                  ${permission === 'member' ? '<li>View and edit board content (lists, cards, etc.)</li>' : ''}
                  ${permission === 'viewer' ? '<li>View board content (read-only access)</li>' : ''}
                </ul>
              </div>
              
              <p>Click the button below to access your new board:</p>
              
              <a href="${boardUrl}" class="cta-button">Open Board in TrelloX</a>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">${boardUrl}</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p><strong>Getting Started with TrelloX:</strong></p>
              <ul>
                <li>Sign in with your email or Google account</li>
                <li>The shared board will appear in your board list</li>
                <li>Start collaborating with your team immediately</li>
              </ul>
            </div>
            <div class="footer">
              <p>This email was sent by TrelloX. If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>© 2024 TrelloX - Your collaborative project management tool</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
        You've been invited to collaborate on TrelloX!
        
        Hi ${recipientName || recipientEmail},
        
        ${sharedByName || sharedByEmail} has invited you to collaborate on the board "${boardTitle}" in TrelloX.
        
        Your permission level: ${permission}
        
        Access your board here: ${boardUrl}
        
        Getting Started:
        1. Sign in with your email or Google account
        2. The shared board will appear in your board list
        3. Start collaborating with your team immediately
        
        If you didn't expect this invitation, you can safely ignore this email.
        
        © 2024 TrelloX
      `
        };
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return result;
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
// Cloud Function triggered when a board is updated (member added)
exports.onBoardMemberAdded = functions.firestore
    .document('boards/{boardId}')
    .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const boardId = context.params.boardId;
    // Check if new members were added
    const beforeMembers = beforeData.members || [];
    const afterMembers = afterData.members || [];
    const newMembers = afterMembers.filter(member => !beforeMembers.includes(member));
    if (newMembers.length === 0) {
        return null; // No new members added
    }
    try {
        // Get board creator information
        const creatorDoc = await admin.firestore().collection('users').doc(afterData.createdBy).get();
        const creatorData = creatorDoc.data();
        // Process each new member
        for (const newMemberId of newMembers) {
            // Skip if the new member is the creator (board creation)
            if (newMemberId === afterData.createdBy) {
                continue;
            }
            // Get new member information
            const memberDoc = await admin.firestore().collection('users').doc(newMemberId).get();
            const memberData = memberDoc.data();
            if (!memberData) {
                console.error(`User data not found for member: ${newMemberId}`);
                continue;
            }
            // Get member permission from boardMembers array
            let permission = 'member';
            if (afterData.boardMembers) {
                const memberInfo = afterData.boardMembers.find(m => m.userId === newMemberId);
                if (memberInfo) {
                    permission = memberInfo.permission;
                }
            }
            // Create board URL
            const boardUrl = `https://trellx.vercel.app/?board=${boardId}`;
            // Send notification email
            await sendBoardSharingEmail(memberData.email, memberData.displayName || memberData.email, afterData.title, (creatorData === null || creatorData === void 0 ? void 0 : creatorData.displayName) || (creatorData === null || creatorData === void 0 ? void 0 : creatorData.email) || 'Someone', (creatorData === null || creatorData === void 0 ? void 0 : creatorData.email) || '', permission, boardUrl);
            console.log(`Board sharing notification sent to: ${memberData.email}`);
        }
        return null;
    }
    catch (error) {
        console.error('Error processing board member addition:', error);
        return null;
    }
});
// Callable function to send test email
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        await sendBoardSharingEmail(data.email, data.name || 'Test User', 'Test Board', 'TrelloX System', 'noreply@trellx.com', 'member', 'https://trellx.vercel.app');
        return { success: true, message: 'Test email sent successfully' };
    }
    catch (error) {
        console.error('Error sending test email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send test email');
    }
});
// Health check function
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'TrelloX Email Notifications'
    });
});
//# sourceMappingURL=index.js.map