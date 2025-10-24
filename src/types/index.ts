// Type definitions for MatchTracker Mobile App

export interface Team {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  players?: Player[];
}

export interface Player {
  id: string;
  name: string;
  goals: number;
  assists: number;
  userId: string;
  teamId?: string;
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStat {
  playerId: string;
  playerName: string;
  goals: number;
  assists: number;
}

export interface PlayerMatchStat {
  id: string;
  goals: number;
  assists: number;
  playerId: string;
  matchId: string;
  player: Player;
}

export interface Match {
  id: string;
  opponent: string;
  date: string;
  goalsFor: number;
  goalsAgainst: number;
  isFinished: boolean;
  matchType: 'league' | 'cup';
  venue: 'home' | 'away';
  notes?: string;
  selectedPlayerIds: string[];
  playerStats: PlayerStat[];
  team?: Team;
  userId: string;
  teamId?: string;
}

export interface ScheduledMatch {
  id: string;
  opponent: string;
  date: string;
  matchType: 'league' | 'cup';
  venue: 'home' | 'away';
  notes?: string;
  selectedPlayerIds: string[];
  isFinished: boolean;
  goalsFor?: number;
  goalsAgainst?: number;
  team?: Team;
}

export interface TeamScore {
  for: number;
  against: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  overview: {
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    winRate: string;
  };
  players: {
    total: number;
    stats: Array<{
      playerId: string;
      playerName: string;
      totalGoals: number;
      totalAssists: number;
      matchesPlayed: number;
      goalsPerMatch: string;
      assistsPerMatch: string;
    }>;
  };
  topPerformers: {
    scorers: Array<{
      playerId: string;
      playerName: string;
      totalGoals: number;
      totalAssists: number;
      matchesPlayed: number;
    }>;
    assists: Array<{
      playerId: string;
      playerName: string;
      totalAssists: number;
      totalGoals: number;
      matchesPlayed: number;
    }>;
  };
}

// API Request/Response types
export interface CreatePlayerInput {
  name: string;
  teamId?: string;
}

export interface UpdatePlayerInput {
  name?: string;
  goals?: number;
  assists?: number;
  teamId?: string | null;
}

export interface CreateMatchInput {
  opponent: string;
  date?: string;
  goalsFor?: number;
  goalsAgainst?: number;
  matchType?: 'league' | 'cup';
  venue?: 'home' | 'away';
  notes?: string;
  selectedPlayerIds?: string[];
  isFinished?: boolean;
  playerStats?: Array<{ playerId: string; goals?: number; assists?: number }>;
}

export interface UpdateMatchInput {
  opponent?: string;
  date?: string;
  goalsFor?: number;
  goalsAgainst?: number;
  matchType?: 'league' | 'cup';
  venue?: 'home' | 'away';
  notes?: string;
  selectedPlayerIds?: string[];
  isFinished?: boolean;
  playerStats?: Array<{ playerId: string; goals?: number; assists?: number }>;
}

export interface CreateTeamInput {
  name: string;
}

export interface UpdateTeamInput {
  name?: string;
}
