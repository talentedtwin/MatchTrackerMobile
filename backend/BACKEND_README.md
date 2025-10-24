# MatchTracker Backend

Next.js backend API with Prisma ORM, PostgreSQL, Clerk authentication, and comprehensive security features.

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 14+ (API Routes)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Clerk
- **Encryption**: AES-256-GCM for sensitive data
- **Security**: Row Level Security (RLS) policies

### Core Features
- ✅ Complete CRUD APIs for all entities
- ✅ Encryption for sensitive fields (player names, team names, user email)
- ✅ Row Level Security (RLS) enforcement
- ✅ Service layer pattern
- ✅ Premium/Free tier support
- ✅ Comprehensive statistics
- ✅ Database connection retry logic
- ✅ Health check endpoints

## Project Structure

```
backend/
├── lib/                          # Core libraries and services
│   ├── prisma.js                 # Prisma client with connection management
│   ├── db-utils.js               # Database utilities and RLS context
│   ├── encryption.js             # EncryptionService for sensitive data
│   ├── playerService.js          # Player business logic
│   └── userService.js            # User business logic
├── middleware/
│   └── auth.js                   # Clerk authentication middleware
├── pages/
│   └── api/                      # API routes
│       ├── health.js             # Health check
│       ├── stats.js              # Statistics API
│       ├── players.js            # GET, POST players
│       ├── players/
│       │   └── [id].js           # GET, PUT, DELETE player
│       ├── teams.js              # GET, POST teams
│       ├── teams/
│       │   └── [id].js           # GET, PUT, DELETE team
│       ├── matches.js            # GET, POST matches
│       ├── matches/
│       │   └── [id].js           # GET, PUT, DELETE match
│       └── player-match-stats.js # Player performance per match
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── clerk-rls.sql             # Row Level Security policies
└── package.json

```

## Database Schema

### Models
1. **User** - Clerk users with premium status and GDPR consent
2. **Team** - User's teams (free: 1 team, premium: unlimited)
3. **Player** - Players with stats (goals, assists)
4. **Match** - Match records with scores and metadata
5. **PlayerMatchStat** - Player performance in specific matches

### Relations
- User → Teams (1:many)
- User → Players (1:many)
- User → Matches (1:many)
- Team → Players (1:many)
- Team → Matches (1:many)
- Player → PlayerMatchStats (1:many)
- Match → PlayerMatchStats (1:many)

### Encrypted Fields
- User: `email`, `name`
- Team: `name`
- Player: `name`

### Soft Delete Support
All user-owned entities support soft deletion with `isDeleted` and `deletedAt` fields.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns database health and system status.

### Players
```
GET    /api/players              # List all players
POST   /api/players              # Create player
GET    /api/players/[id]         # Get player by ID
PUT    /api/players/[id]         # Update player
DELETE /api/players/[id]         # Soft delete player
```

### Teams
```
GET    /api/teams                # List all teams
POST   /api/teams                # Create team (premium check)
GET    /api/teams/[id]           # Get team by ID
PUT    /api/teams/[id]           # Update team
DELETE /api/teams/[id]           # Soft delete team
```

### Matches
```
GET    /api/matches              # List matches (with filters)
POST   /api/matches              # Create match
GET    /api/matches/[id]         # Get match by ID
PUT    /api/matches/[id]         # Update match
DELETE /api/matches/[id]         # Hard delete match
```

Query parameters for GET /api/matches:
- `isFinished` - Filter by finished status
- `teamId` - Filter by team
- `matchType` - Filter by type (league/cup)
- `venue` - Filter by venue (home/away)
- `limit` - Limit results (default: 50)

### Player Match Stats
```
GET    /api/player-match-stats   # List player stats
POST   /api/player-match-stats   # Create/update player stat
```

Query parameters for GET:
- `playerId` - Filter by player
- `matchId` - Filter by match

### Statistics
```
GET /api/stats?type=overview     # Overall user statistics
GET /api/stats?type=players      # Player leaderboards
GET /api/stats?type=matches      # Match statistics
GET /api/stats?type=teams        # Team statistics
```

## Security Features

### Authentication
All API routes require Clerk authentication. The `requireAuth()` function:
1. Validates Clerk session
2. Gets user ID
3. Ensures user exists in database
4. Returns user ID for RLS context

### Row Level Security (RLS)
Database policies ensure users can only access their own data:
- Enforced via `withDatabaseUserContext(userId, operation)`
- Sets PostgreSQL session variable: `app.current_user_id`
- All queries automatically filtered by user ID

### Encryption
Sensitive fields are encrypted at rest using AES-256-GCM:
```javascript
// Encrypt before saving
const encrypted = EncryptionService.encrypt(plaintext);

// Decrypt when reading
const plaintext = EncryptionService.decrypt(encrypted);
```

Requires `ENCRYPTION_KEY` environment variable.

## Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Encryption
ENCRYPTION_KEY="your-secure-encryption-key"

# Optional
NODE_ENV="development"
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Generate Prisma Client
```bash
npm run db:generate
```

### 3. Push Schema to Database
```bash
npm run db:push
```

### 4. Apply RLS Policies
```bash
psql $DATABASE_URL -f prisma/clerk-rls.sql
```

### 5. Start Development Server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

## Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migrations (production)
npm run db:migrate

# Open Prisma Studio (GUI)
npm run db:studio
```

## Service Layer

### PlayerService
Business logic for player operations:
- `createPlayer(userId, data)` - Create with encryption
- `getPlayersForUser(userId, options)` - List with decryption
- `getPlayerById(userId, playerId)` - Get single player
- `updatePlayer(userId, playerId, data)` - Update
- `deletePlayer(userId, playerId)` - Soft delete
- `getPlayerStats(userId, playerId)` - Calculate statistics
- `assignPlayerToTeam(userId, playerId, teamId)` - Team assignment

### UserService
User management and GDPR compliance:
- `ensureUserExists(clerkUserId, userData)` - Create/get user
- `getUserById(userId)` - Get with all relations
- `updateUser(userId, data)` - Update user
- `deleteUser(userId)` - Soft delete (GDPR)
- `exportUserData(userId)` - GDPR data export
- `updateConsent(userId, hasConsent)` - GDPR consent
- `isPremium(userId)` - Check premium status
- `getUserStats(userId)` - Comprehensive statistics

## Premium Features

### Free Tier Limits
- 1 team maximum
- Unlimited players
- Unlimited matches

### Premium Tier
- Unlimited teams
- All free tier features
- Future: Advanced analytics, exports, etc.

Check in API:
```javascript
const isPremium = await UserService.isPremium(userId);
if (!isPremium && teamCount >= 1) {
  return res.status(403).json({ error: 'Upgrade required' });
}
```

## Error Handling

All API routes return consistent JSON responses:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error (development only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (premium required)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error
- `503` - Service Unavailable (health check)

## Database Utilities

### Connection Management
```javascript
const { getPrisma, connectDb, healthCheck } = require('./lib/prisma');

// Get Prisma client
const prisma = getPrisma();

// Connect with retry
await connectDb();

// Health check
const health = await healthCheck();
```

### RLS Context
```javascript
const { withDatabaseUserContext } = require('./lib/db-utils');

// Execute with RLS
const players = await withDatabaseUserContext(userId, async (tx) => {
  return await tx.player.findMany();
});
```

### Retry Operations
```javascript
const { executeWithRetry } = require('./lib/prisma');

// Retry on connection failures
const result = await executeWithRetry(async () => {
  return await prisma.player.findMany();
}, 3);
```

## Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### API Testing
Use tools like Postman, Insomnia, or curl:

```bash
# List players (requires Clerk token)
curl -H "Authorization: Bearer <clerk-token>" \
  http://localhost:3000/api/players

# Create player
curl -X POST \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","teamId":"123"}' \
  http://localhost:3000/api/players
```

## Performance Considerations

### Database Indexes
All user-facing queries are indexed:
- `users.isDeleted`
- `teams.userId, teams.isDeleted`
- `players.userId, players.isDeleted`
- `players.teamId`
- `matches.userId, matches.isFinished`
- `matches.teamId`
- `matches.date`
- `player_match_stats.playerId`
- `player_match_stats.matchId`

### Connection Pooling
Prisma automatically manages connection pooling. Configure in DATABASE_URL:
```
?connection_limit=10&pool_timeout=20
```

### Query Optimization
- Use `include` for relations instead of multiple queries
- Soft delete queries automatically filtered
- Limit results with `take` parameter
- Use indexes for frequently filtered fields

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables on Vercel
Add all `.env` variables in Vercel dashboard under Settings → Environment Variables.

### Database Migration
Use Prisma Migrate for production:
```bash
npm run db:migrate
```

Then apply RLS policies to production database.

## Troubleshooting

### Connection Errors
- Check DATABASE_URL is correct
- Verify database is accessible
- Check connection pool limits
- Review Prisma logs

### Authentication Errors
- Verify Clerk keys are set
- Check token is passed in header
- Ensure user exists in database

### RLS Issues
- Verify policies are applied: `psql -f prisma/clerk-rls.sql`
- Check `app.current_user_id` is set
- Review PostgreSQL logs

### Encryption Errors
- Ensure ENCRYPTION_KEY is set
- Key must be consistent across deployments
- Verify encrypted data is not corrupted

## Development Tips

1. **Use Prisma Studio** for database inspection:
   ```bash
   npm run db:studio
   ```

2. **Enable query logging** in development (already configured):
   ```javascript
   log: ['query', 'error', 'warn']
   ```

3. **Test RLS policies** directly in PostgreSQL:
   ```sql
   SET app.current_user_id = 'user_123';
   SELECT * FROM players;
   ```

4. **Monitor health** endpoint regularly:
   ```bash
   watch -n 5 curl http://localhost:3000/api/health
   ```

## Future Enhancements

- [ ] Real-time updates with WebSockets
- [ ] Advanced analytics and reports
- [ ] Data export (CSV, PDF)
- [ ] Webhooks for external integrations
- [ ] Admin dashboard
- [ ] Backup and restore endpoints
- [ ] Rate limiting
- [ ] API versioning

## Support

For issues or questions:
1. Check this README
2. Review Prisma documentation
3. Check Clerk documentation
4. Review API response error messages
