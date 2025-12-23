-- Add playerOfTheMatchId field to matches table
ALTER TABLE "matches" ADD COLUMN "playerOfTheMatchId" TEXT;

-- Add index for playerOfTheMatchId
CREATE INDEX "matches_playerOfTheMatchId_idx" ON "matches"("playerOfTheMatchId");
