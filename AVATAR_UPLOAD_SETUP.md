# Avatar Upload Setup Guide

This guide will help you set up Cloudinary for team avatar uploads.

## Features

- Upload team avatars when creating or editing teams
- Images are automatically optimized and resized to 400x400
- Stored securely in Cloudinary
- Users can change or remove avatars anytime

## Cloudinary Setup

### 1. Create a Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Credentials

1. Log in to your Cloudinary dashboard
2. Go to the Dashboard home page
3. You'll see your credentials:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Add Environment Variables

Add these environment variables to your backend `.env` file:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Important**: Never commit your `.env` file to version control!

## Testing the Upload Feature

### 1. Start the Backend

```bash
cd backend
npm run dev
```

### 2. Start the Mobile App

```bash
npm start
```

### 3. Test Avatar Upload

1. Open the app
2. Navigate to Settings → Manage Teams
3. Create a new team or edit an existing one
4. Tap the camera icon to upload an avatar
5. Select an image from your photo library
6. The image will be uploaded and appear as the team avatar

## How It Works

### Frontend (Mobile App)

1. User taps the camera icon in AddTeamScreen
2. Image picker opens (requires photo library permission)
3. User selects and crops image (1:1 aspect ratio)
4. Image is converted to base64
5. Uploaded to backend `/api/upload` endpoint
6. Cloudinary URL is saved with the team

### Backend API

- **POST /api/upload** - Uploads image to Cloudinary

  - Accepts: base64 image data
  - Returns: Cloudinary secure URL
  - Transformations applied:
    - Resize to 400x400 (face detection for cropping)
    - Auto quality optimization
    - Auto format selection (WebP when supported)

- **POST /api/teams** - Create team with avatar
- **PUT /api/teams/[id]** - Update team with new avatar

### Database

The `Team` model now includes an `avatar` field:

```prisma
model Team {
  id        String    @id @default(cuid())
  name      String
  avatar    String?   // Cloudinary URL
  // ... other fields
}
```

## Image Storage Structure

Images are organized in Cloudinary folders:

```
matchtracker/
  └── team-avatars/
      ├── image1.jpg
      ├── image2.jpg
      └── ...
```

## Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month

This should be more than enough for most use cases!

## Troubleshooting

### "Failed to upload image"

1. Check that your Cloudinary credentials are correct in `.env`
2. Verify the backend server is running
3. Check the backend logs for detailed error messages

### "Permission Required"

The app needs permission to access your photo library:

- iOS: Go to Settings → [App Name] → Photos → Allow Access
- Android: Go to Settings → Apps → [App Name] → Permissions → Storage → Allow

### Image Upload is Slow

- Make sure you're selecting reasonably sized images
- The app automatically compresses images (quality: 0.8)
- Larger images take longer to upload

## Security Notes

- All uploads require authentication (Clerk token)
- Images are only accessible via the returned Cloudinary URL
- Users can only upload avatars for their own teams
- Images are automatically optimized to prevent abuse

## Future Enhancements

Potential improvements:

- Player avatars
- Match photos
- Image galleries
- Custom upload folders per user
- Image moderation

---

**Need help?** Check the Cloudinary documentation at [cloudinary.com/documentation](https://cloudinary.com/documentation)
