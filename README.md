# MatchTracker Mobile

A mobile application built with Expo and React Native, powered by a Next.js backend API.

## Project Structure

```
MatchTrackerMobile/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API services
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   ├── utils/             # Utility functions
│   └── config/            # App configuration
├── backend/               # Next.js backend API
│   ├── pages/api/        # API routes
│   ├── lib/              # Libraries and utilities
│   ├── models/           # Data models
│   ├── middleware/       # API middleware
│   ├── config/           # Backend configuration
│   └── utils/            # Helper functions
├── assets/               # Static assets (images, fonts)
├── App.js               # Main app component
└── package.json         # Frontend dependencies
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Studio (for Android development)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start the Expo development server:
```bash
npm start
# or
expo start
```

4. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press 'i' for iOS simulator
   - Press 'a' for Android emulator

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at http://localhost:3000

## Required Dependencies

### Frontend (Mobile App)

Install the required packages:

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install axios
npm install @react-native-async-storage/async-storage
```

### Backend (Next.js API)

The backend dependencies are defined in `backend/package.json`. Additional packages you might need:

```bash
cd backend
npm install mongoose # for MongoDB
# or
npm install pg # for PostgreSQL
npm install jsonwebtoken bcryptjs # for authentication
npm install cors
```

## Features

- 📱 Cross-platform mobile app (iOS & Android)
- 🔐 Authentication context ready
- 🌐 API integration with axios
- 🧭 React Navigation setup
- 💾 Local storage with AsyncStorage
- 🎨 Customizable UI components
- 🔧 Next.js API backend
- 🗄️ Database ready (MongoDB/PostgreSQL)

## Development

### Running Tests

```bash
npm test
```

### Building for Production

#### Mobile App
```bash
expo build:android
expo build:ios
```

#### Backend
```bash
cd backend
npm run build
npm start
```

## Environment Variables

### Frontend (.env)
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_APP_NAME` - Application name

### Backend (.env.local)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Create a match
- `PUT /api/matches` - Update a match
- `DELETE /api/matches` - Delete a match

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
