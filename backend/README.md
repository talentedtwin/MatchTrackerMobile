# MatchTracker Backend (Next.js API)

This is the backend API for the MatchTracker mobile application, built with Next.js API routes.

## Getting Started

### Installation

```bash
cd backend
npm install
```

### Running the Development Server

```bash
npm run dev
```

The API will be available at [http://localhost:3000](http://localhost:3000)

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Create a new match
- `PUT /api/matches` - Update a match
- `DELETE /api/matches?id={id}` - Delete a match

## Project Structure

```
backend/
├── pages/
│   └── api/           # API routes
├── lib/               # Utilities and database connections
├── models/            # Data models
├── middleware/        # Custom middleware
├── config/            # Configuration files
├── utils/             # Helper functions
└── package.json
```

## Environment Variables

Create a `.env.local` file in the backend directory:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Database

Configure your database connection in `config/database.js` and implement the connection logic in `lib/db.js`.

## Deployment

To deploy to production:

```bash
npm run build
npm start
```

Or deploy to Vercel:

```bash
vercel
```
