-- Add relative_id to transformations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='transformations' 
        AND column_name='position'
    ) THEN
        ALTER TABLE transformations ADD COLUMN position TEXT NOT NULL DEFAULT 'a';
        UPDATE transformations SET position = 'a' WHERE position IS NULL;
    END IF;
END $$;

