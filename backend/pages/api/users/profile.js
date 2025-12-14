import { requireAuth } from "../../../middleware/auth.js";
import { withDatabaseUserContext } from "../../../lib/db-utils.js";

export default async function handler(req, res) {
  try {
    const userId = await requireAuth(req);

    // GET - Get user profile
    if (req.method === "GET") {
      const user = await withDatabaseUserContext(userId, async (tx) => {
        return await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            isPremium: true,
            emailNotifications: true,
            pushNotifications: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Note: Email and name come from Clerk, not stored/returned here
      return res.status(200).json({ user });
    }

    // PUT - Update user profile
    if (req.method === "PUT") {
      const { emailNotifications, pushNotifications } = req.body;

      const updateData = {};

      // Only allow updating notification preferences
      // Note: Email, name, and premium status are managed separately

      if (typeof emailNotifications === "boolean") {
        updateData.emailNotifications = emailNotifications;
      }

      if (typeof pushNotifications === "boolean") {
        updateData.pushNotifications = pushNotifications;
      }

      const updatedUser = await withDatabaseUserContext(userId, async (tx) => {
        return await tx.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            isPremium: true,
            emailNotifications: true,
            pushNotifications: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });

      return res.status(200).json({ user: updatedUser });
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error("Error in profile handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
