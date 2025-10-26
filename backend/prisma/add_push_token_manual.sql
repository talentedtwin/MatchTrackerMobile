-- Add pushToken column to users table if it doesn't exist
-- Run this SQL directly on your database if the column is missing

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='users' 
    AND column_name='pushToken'
  ) THEN
    ALTER TABLE users ADD COLUMN "pushToken" TEXT NULL;
    RAISE NOTICE 'Column pushToken added to users table';
  ELSE
    RAISE NOTICE 'Column pushToken already exists in users table';
  END IF;
END $$;
