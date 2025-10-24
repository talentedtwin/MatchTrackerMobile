-- Row Level Security (RLS) Policies for MatchTracker
-- Based on Clerk user IDs as the RLS context

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  WITH CHECK (id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own data"
  ON users FOR DELETE
  USING (id = current_setting('app.current_user_id', TRUE));

-- Teams table policies
CREATE POLICY "Users can view their own teams"
  ON teams FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can create their own teams"
  ON teams FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own teams"
  ON teams FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own teams"
  ON teams FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Players table policies
CREATE POLICY "Users can view their own players"
  ON players FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can create their own players"
  ON players FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own players"
  ON players FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own players"
  ON players FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Matches table policies
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can create their own matches"
  ON matches FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can update their own matches"
  ON matches FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY "Users can delete their own matches"
  ON matches FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE));

-- Player match stats table policies
CREATE POLICY "Users can view their own player match stats"
  ON player_match_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = player_match_stats.match_id
      AND m.user_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY "Users can create their own player match stats"
  ON player_match_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = player_match_stats.match_id
      AND m.user_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY "Users can update their own player match stats"
  ON player_match_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = player_match_stats.match_id
      AND m.user_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY "Users can delete their own player match stats"
  ON player_match_stats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = player_match_stats.match_id
      AND m.user_id = current_setting('app.current_user_id', TRUE)
    )
  );
