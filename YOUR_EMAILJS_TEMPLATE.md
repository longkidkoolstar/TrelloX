# Your EmailJS Template Configuration

## Your Current Settings ✅
- **Service ID**: `trellox`
- **Template ID**: `template_69mkl1h`
- **Public Key**: `s5_tQhzF3l5SN0FA-`

## Email Template Setup

Go to your EmailJS dashboard and make sure your template `template_69mkl1h` has this content:

### Subject Line:
```
You've been added to "{{board_title}}" on {{app_name}}
```

### Email Body:
```
Hello {{to_name}},

{{message}}

📋 **Board Details:**
- Board Name: {{board_title}}
- Your Permission Level: {{permission_level}}
- What you can do: {{permission_description}}

🔗 **Access Your Board:**
Click here to access the board: {{board_url}}

👤 **Shared by:**
{{from_name}} ({{from_email}})

---

This email was sent via {{app_name}}. If you didn't expect this invitation, you can safely ignore this email.

Happy collaborating!
The TrelloX Team
```

## Template Variables Used

Make sure your EmailJS template includes these variables:
- `{{to_name}}` - Recipient's name
- `{{to_email}}` - Recipient's email
- `{{from_name}}` - Person sharing the board
- `{{from_email}}` - Sharer's email
- `{{board_title}}` - Name of the shared board
- `{{board_url}}` - Direct link to the board
- `{{permission_level}}` - User's permission (Owner, Admin, Member, Viewer)
- `{{permission_description}}` - What they can do
- `{{app_name}}` - "TrelloX"
- `{{message}}` - Personalized message

## Test Your Configuration

1. **Restart your development server** to load the new environment variables:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Test email notifications**:
   - Open TrelloX in your browser
   - Share a board with someone
   - Check if they receive an email

3. **Check browser console** for any error messages

## Troubleshooting

### If emails aren't sending:
1. **Check EmailJS Dashboard**: Verify your service is connected and active
2. **Verify Template**: Make sure template `template_69mkl1h` exists and is published
3. **Check Console**: Look for error messages in browser developer tools
4. **Test Service**: Try sending a test email from EmailJS dashboard

### Common Issues:
- **Service not connected**: Make sure your email service (Gmail, etc.) is properly connected in EmailJS
- **Template not found**: Verify the template ID is correct
- **Quota exceeded**: Free EmailJS accounts have 200 emails/month limit
- **Blocked by email provider**: Some providers block automated emails

## Email Preview

When working correctly, recipients will receive an email like this:

```
Subject: You've been added to "My Project Board" on TrelloX

Hello john@example.com,

Jane Smith has invited you to collaborate on the board "My Project Board" in TrelloX.

📋 Board Details:
- Board Name: My Project Board
- Your Permission Level: Member
- What you can do: Can view and edit board content (lists, cards, etc.)

🔗 Access Your Board:
Click here to access the board: https://trellx.vercel.app/?board=abc123

👤 Shared by:
Jane Smith (jane@example.com)

---

This email was sent via TrelloX. If you didn't expect this invitation, you can safely ignore this email.

Happy collaborating!
The TrelloX Team
```

## Next Steps

1. Update your EmailJS template with the content above
2. Restart your development server
3. Test by sharing a board with yourself or a friend
4. Check that emails are being sent and received

Your email notifications should now work perfectly! 🎉
