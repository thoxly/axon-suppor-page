-- Add telegram_data column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'telegram_data'
    ) THEN 
        ALTER TABLE users ADD COLUMN telegram_data JSONB;
    END IF;
END $$; 