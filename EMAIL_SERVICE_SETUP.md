# Email Service Configuration

## Overview
The Heron Square Maintenance App includes email notification functionality using the Resend API. This allows automatic email notifications to be sent when new maintenance issues are submitted.

## Current Status
**Email service is currently disabled** - The `RESEND_API_KEY` environment variable is not configured in Netlify, so email notifications will be skipped gracefully without breaking the app functionality.

## How to Enable Email Notifications

### Step 1: Get Resend API Key
1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Create an API key
4. Copy the API key

### Step 2: Configure Netlify Environment Variables
1. Go to your Netlify dashboard
2. Navigate to Site settings → Environment variables
3. Add the following environment variables:

```
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=enquiries@heronsquare.co.za
```

### Step 3: Verify Domain (Optional)
For production use, you may want to verify your domain with Resend to improve email deliverability.

## Email Recipients

### Maintenance Notifications
Sent to maintenance crew members (currently hardcoded):
- `maintenance@heronsquare.co.za`
- `kea.khoele@gmail.com` (Primary crew member)
- `enquiries@heronsquare.co.za` (Admin email)

### Admin Notifications
Sent to administrators:
- `kea.khoele@gmail.com`
- `enquiries@heronsquare.co.za`

## Email Content
The emails include:
- Issue details (tenant name, unit, address, category, type, description, urgency)
- Submission timestamp
- Professional HTML formatting
- Heron Square branding

## Troubleshooting

### Common Issues
1. **500 Internal Server Error**: Usually means `RESEND_API_KEY` is not configured
2. **Email not delivered**: Check spam folder, verify domain with Resend
3. **Rate limiting**: Resend has rate limits on free accounts

### Console Messages
- `Email service not configured (RESEND_API_KEY missing), skipping notification` - Normal when email service is disabled
- `Email sent successfully` - Email was sent successfully
- `Error sending email notification` - Check Netlify function logs for details

## Cost
- Resend free tier: 3,000 emails/month
- Paid plans start at $20/month for 50,000 emails

## Alternative Solutions
If you prefer not to use Resend, you can:
1. Use Netlify Forms (free but limited)
2. Use another email service (SendGrid, Mailgun, etc.)
3. Disable email notifications entirely (current state)
