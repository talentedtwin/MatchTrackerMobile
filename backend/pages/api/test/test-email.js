import { requireAuth } from "../../../middleware/auth.js";
import {
  sendMatchReminderEmail,
  sendWelcomeEmail,
} from "../../../lib/emailService.js";
import { withDatabaseUserContext } from "../../../lib/db-utils.js";

export default async function handler(req, res) {
  try {
    const userId = await requireAuth(req);

    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} not allowed` });
    }

    const { type, matchId } = req.body;

    // Get user details
    const user = await withDatabaseUserContext(userId, async (tx) => {
      return await tx.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          emailNotifications: true,
        },
      });
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.emailNotifications) {
      return res.status(400).json({
        error: "Email notifications are disabled",
        message: "Please enable email notifications in your settings first",
      });
    }

    // Send test email based on type
    if (type === "welcome") {
      await sendWelcomeEmail(user.email, user.name);
      return res.status(200).json({
        message: "Welcome email sent successfully",
        email: user.email,
      });
    }

    if (type === "match-reminder") {
      if (!matchId) {
        return res
          .status(400)
          .json({ error: "matchId is required for match reminder" });
      }

      // Get match details
      const match = await withDatabaseUserContext(userId, async (tx) => {
        return await tx.match.findUnique({
          where: { id: matchId },
          include: {
            user: {
              select: { id: true },
            },
          },
        });
      });

      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (match.user.id !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this match" });
      }

      await sendMatchReminderEmail(user.email, user.name, {
        id: match.id,
        opponent: match.opponent,
        venue: match.venue,
        date: match.date,
        type: match.type,
      });

      return res.status(200).json({
        message: "Match reminder email sent successfully",
        email: user.email,
        match: {
          id: match.id,
          opponent: match.opponent,
        },
      });
    }

    return res.status(400).json({
      error: "Invalid email type",
      message: 'Type must be either "welcome" or "match-reminder"',
    });
  } catch (error) {
    console.error("Error in test-email handler:", error);
    return res.status(500).json({
      error: "Failed to send email",
      message: error.message,
    });
  }
}
