-- Add profile fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'Prefer Not To Say'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS maps_link TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Add profile fields to riders
ALTER TABLE riders ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'Prefer Not To Say'));
ALTER TABLE riders ADD COLUMN IF NOT EXISTS maps_link TEXT;

-- Add profile fields to cashiers
ALTER TABLE cashiers ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
ALTER TABLE cashiers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE cashiers ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE cashiers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'Prefer Not To Say'));
ALTER TABLE cashiers ADD COLUMN IF NOT EXISTS maps_link TEXT;
