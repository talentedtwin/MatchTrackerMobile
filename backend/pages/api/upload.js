/**
 * Upload API Route
 * POST /api/upload - Upload image to Cloudinary
 */
import { requireAuth } from "../../middleware/auth.js";
import cloudinary from "../../config/cloudinary.js";

async function handler(req, res) {
  try {
    // Get authenticated user
    const userId = await requireAuth(req);

    if (req.method === "POST") {
      const { image, folder = "team-avatars" } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Image data is required",
        });
      }

      // Construct the folder path
      const folderPath = `match-tracker-app/${folder}/${userId}`;
      console.log("📁 Uploading to Cloudinary folder:", folderPath);

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: folderPath,
        upload_preset: "match_tracker_app",
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "center" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      });

      console.log("✅ Upload successful:", {
        publicId: result.public_id,
        url: result.secure_url,
        folder: result.folder,
      });

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("Upload API error:", error);

    if (error.message === "Authentication required") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to upload image",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

export default handler;

// Configure Next.js to accept larger payloads for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
