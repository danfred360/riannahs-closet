import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

export async function sendAccountDeletionEmail(email: string, displayName: string | null): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { error } = await client.emails.send({
      from: fromEmail || 'Riannah\'s Closet <noreply@riannahscloset.com>',
      to: email,
      subject: 'Account Deleted - Riannah\'s Closet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; background-color: #faf8f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
            h1 { color: #2d2d2d; font-size: 24px; margin-bottom: 20px; }
            p { color: #555; line-height: 1.6; margin-bottom: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Deleted</h1>
            <p>Hi${displayName ? ` ${displayName}` : ''},</p>
            <p>This email confirms that your Riannah's Closet account has been permanently deleted.</p>
            <p>All your wardrobe items, outfits, and planned looks have been removed from our system.</p>
            <p>We're sad to see you go! If you ever want to organize your wardrobe again, you're always welcome to create a new account.</p>
            <div class="footer">
              <p>Riannah's Closet - Your wardrobe, beautifully organized</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send account deletion email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending account deletion email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
    
    const { error } = await client.emails.send({
      from: fromEmail || 'Riannah\'s Closet <noreply@riannahscloset.com>',
      to: email,
      subject: 'Reset Your Password - Riannah\'s Closet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; background-color: #faf8f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
            h1 { color: #2d2d2d; font-size: 24px; margin-bottom: 20px; }
            p { color: #555; line-height: 1.6; margin-bottom: 20px; }
            .button { display: inline-block; background: #4a5d4a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; }
            .code { background: #f5f5f5; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 24px; letter-spacing: 4px; text-align: center; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password for Riannah's Closet. Use the code below to reset your password:</p>
            <div class="code">${resetToken}</div>
            <p>Enter this code in the app to create a new password.</p>
            <p>This code expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <div class="footer">
              <p>Riannah's Closet - Your wardrobe, beautifully organized</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}
