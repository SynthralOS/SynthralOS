-- Slack integration schema updates

-- First check if the enum type exists, create if it doesn't
DO $$
BEGIN
    -- Check if the enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slack_connection_status') THEN
        -- Create the enum type
        CREATE TYPE slack_connection_status AS ENUM ('connected', 'error', 'disconnected');
    END IF;
END$$;

-- Create the slack_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS slack_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bot_token VARCHAR NOT NULL,
    channel_id VARCHAR,
    default_channel_id VARCHAR,
    team_id VARCHAR,
    workspace_name VARCHAR,
    connection_status slack_connection_status DEFAULT 'disconnected',
    last_connection_error TEXT,
    last_connected_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_user_id_idx') THEN
        CREATE INDEX slack_config_user_id_idx ON slack_configs (user_id);
    END IF;
END$$;

-- Create index on is_active if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_is_active_idx') THEN
        CREATE INDEX slack_config_is_active_idx ON slack_configs (is_active);
    END IF;
END$$;

-- If the slack_configs table exists, update it
DO $$
BEGIN
        -- Add default_channel_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'default_channel_id') THEN
            ALTER TABLE slack_configs ADD COLUMN default_channel_id VARCHAR;
        END IF;
        
        -- Add connection_status column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'connection_status') THEN
            ALTER TABLE slack_configs ADD COLUMN connection_status slack_connection_status DEFAULT 'disconnected';
        END IF;
        
        -- Add last_connection_error column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'last_connection_error') THEN
            ALTER TABLE slack_configs ADD COLUMN last_connection_error TEXT;
        END IF;
        
        -- Add last_connected_at column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'last_connected_at') THEN
            ALTER TABLE slack_configs ADD COLUMN last_connected_at TIMESTAMP;
        END IF;
        
        -- Add index on connection_status if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_conn_status_idx') THEN
            CREATE INDEX slack_config_conn_status_idx ON slack_configs (connection_status);
        END IF;
    END IF;
END$$;

-- Update any existing records to initialize the connection_status based on other fields
UPDATE slack_configs 
SET 
    connection_status = 
        CASE 
            WHEN last_connected_at IS NOT NULL AND (last_connected_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')) THEN 'connected'::slack_connection_status
            WHEN last_connection_error IS NOT NULL THEN 'error'::slack_connection_status
            ELSE 'disconnected'::slack_connection_status
        END
WHERE connection_status IS NULL;

-- Set proper NULL/NOT NULL constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_configs') THEN
        -- Default connection_status to 'disconnected' for any existing records
        UPDATE slack_configs SET connection_status = 'disconnected'::slack_connection_status WHERE connection_status IS NULL;
        
        -- Add NOT NULL constraint to connection_status if it doesn't already have it
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'slack_configs' 
            AND column_name = 'connection_status'
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE slack_configs ALTER COLUMN connection_status SET NOT NULL;
        END IF;
    END IF;
END$$;