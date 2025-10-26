-- Quick database check script
-- Run this to verify your database schema

-- Check if pushToken column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if there are any users
SELECT id, email, "pushToken", "createdAt" 
FROM users 
LIMIT 5;
