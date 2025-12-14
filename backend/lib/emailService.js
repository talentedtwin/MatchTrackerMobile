import formData from "form-data";
import Mailgun from "mailgun.js";

// Initialize Mailgun client
let mailgun = null;
let mg = null;

function initializeMailgun() {
  if (!mg && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    mailgun = new Mailgun(formData);
    mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
      // When you have an EU-domain, you must specify the endpoint:
      url: "https://api.eu.mailgun.net",
    });
    console.log("✅ Mailgun initialized");
  }
  return mg;
}

/**
 * Send an email using Mailgun
 * @param {Object} emailData - Email configuration
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.text - Plain text version
 * @param {string} emailData.html - HTML version
 * @param {string} emailData.from - Optional sender email (defaults to env var)
 */
export async function sendEmail({ to, subject, text, html, from }) {
  const client = initializeMailgun();

  if (!client) {
    console.error(
      "❌ Mailgun not configured - missing MAILGUN_API_KEY or MAILGUN_DOMAIN"
    );
    return null;
  }

  try {
    const messageData = {
      from:
        from ||
        process.env.MAILGUN_FROM_EMAIL ||
        `MatchTracker <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [to],
      subject,
      text,
      html: html || text, // Fallback to text if no HTML provided
    };

    console.log(`📧 Sending email to ${to}: ${subject}`);

    const response = await client.messages.create(
      process.env.MAILGUN_DOMAIN,
      messageData
    );

    console.log("✅ Email sent successfully:", response.id);
    return response;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

/**
 * Send a match reminder email to a user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 * @param {Object} match - Match details
 */
export async function sendMatchReminderEmail(userEmail, userName, match) {
  const matchDate = new Date(match.date);
  const formattedDate = matchDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = matchDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `⚽ Match Reminder: ${match.opponent}`;

  const text = `
Hi ${userName || "there"},

This is a reminder that your match is starting soon!

Match Details:
- Opponent: ${match.opponent}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Venue: ${match.venue || "TBD"}
${
  match.type
    ? `- Type: ${match.type.charAt(0).toUpperCase() + match.type.slice(1)}`
    : ""
}

Good luck with your match!

---
MatchTracker
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">⚽</h1>
              <h2 style="margin: 10px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 600;">Match Starting Soon!</h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Hi ${userName || "there"},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                This is a reminder that your match is starting soon!
              </p>
              
              <!-- Match Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #2563eb; font-weight: 600;">Match Details</h3>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 100px;">Opponent:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">${
                          match.opponent
                        }</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Date:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Time:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">${formattedTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Venue:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">${
                          match.venue || "TBD"
                        }</td>
                      </tr>
                      ${
                        match.type
                          ? `
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Type:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">${
                          match.type.charAt(0).toUpperCase() +
                          match.type.slice(1)
                        }</td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333333; line-height: 1.5; font-weight: 600;">
                Good luck with your match! 🍀
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                MatchTracker - Track your football matches
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999999;">
                You're receiving this email because you have email notifications enabled for match reminders.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });

    console.log(`✅ Match reminder email sent to ${userEmail}`);
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to send match reminder email to ${userEmail}:`,
      error
    );
    throw error;
  }
}

/**
 * Send a welcome email to a new user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name (optional)
 */
export async function sendWelcomeEmail(userEmail, userName) {
  const subject = "⚽ Welcome to MatchTracker!";

  const text = `
Hi ${userName || "there"},

Welcome to MatchTracker! We're excited to have you on board.

With MatchTracker, you can:
- Track your football matches
- Record player statistics
- Manage multiple teams
- Get match reminders
- View detailed analytics

Get started by adding your first team and scheduling your upcoming matches.

If you have any questions, feel free to reach out.

Happy tracking!

---
The MatchTracker Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MatchTracker</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 48px;">⚽</h1>
              <h2 style="margin: 20px 0 0 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to MatchTracker!</h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Hi ${userName || "there"},
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Welcome to MatchTracker! We're excited to have you on board. 🎉
              </p>
              
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #2563eb; font-weight: 600;">What you can do with MatchTracker:</h3>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                    ✅ Track your football matches
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                    📊 Record player statistics
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                    👥 Manage multiple teams
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                    🔔 Get match reminders
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 15px; color: #333333; line-height: 1.6;">
                    📈 View detailed analytics
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Get started by adding your first team and scheduling your upcoming matches!
              </p>
              
              <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.5;">
                If you have any questions, feel free to reach out.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #666666; font-weight: 600;">
                Happy tracking! ⚽
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999999;">
                The MatchTracker Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await sendEmail({
      to: userEmail,
      subject,
      text,
      html,
    });

    console.log(`✅ Welcome email sent to ${userEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${userEmail}:`, error);
    throw error;
  }
}
