// Migration runner for Slack schema updates
import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Configure Neon to use ws package for WebSocket
neonConfig.webSocketConstructor = ws;

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Starting Slack schema migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required!');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Beginning transaction...');
      await client.query('BEGIN');
      
      // Execute migration statements one by one
      console.log('Creating enum type...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slack_connection_status') THEN
            CREATE TYPE slack_connection_status AS ENUM ('connected', 'error', 'disconnected');
          END IF;
        END$$;
      `);
      
      console.log('Creating slack_configs table...');
      await client.query(`
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
      `);
      
      console.log('Creating user_id index...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_user_id_idx') THEN
            CREATE INDEX slack_config_user_id_idx ON slack_configs (user_id);
          END IF;
        END$$;
      `);
      
      console.log('Creating is_active index...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_is_active_idx') THEN
            CREATE INDEX slack_config_is_active_idx ON slack_configs (is_active);
          END IF;
        END$$;
      `);
      
      console.log('Creating connection_status index...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_configs' AND indexname = 'slack_config_conn_status_idx') THEN
            CREATE INDEX slack_config_conn_status_idx ON slack_configs (connection_status);
          END IF;
        END$$;
      `);
      
      console.log('Adding columns if needed...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'default_channel_id') THEN
            ALTER TABLE slack_configs ADD COLUMN default_channel_id VARCHAR;
          END IF;
        END$$;
      `);
      
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'connection_status') THEN
            ALTER TABLE slack_configs ADD COLUMN connection_status slack_connection_status DEFAULT 'disconnected';
          END IF;
        END$$;
      `);
      
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'last_connection_error') THEN
            ALTER TABLE slack_configs ADD COLUMN last_connection_error TEXT;
          END IF;
        END$$;
      `);
      
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'slack_configs' AND column_name = 'last_connected_at') THEN
            ALTER TABLE slack_configs ADD COLUMN last_connected_at TIMESTAMP;
          END IF;
        END$$;
      `);
      
      console.log('Updating connection status...');
      await client.query(`
        UPDATE slack_configs 
        SET 
          connection_status = 
            CASE 
              WHEN last_connected_at IS NOT NULL AND (last_connected_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')) THEN 'connected'::slack_connection_status
              WHEN last_connection_error IS NOT NULL THEN 'error'::slack_connection_status
              ELSE 'disconnected'::slack_connection_status
            END
        WHERE connection_status IS NULL;
      `);
      
      console.log('Setting NOT NULL constraints...');
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_configs') THEN
            UPDATE slack_configs SET connection_status = 'disconnected'::slack_connection_status WHERE connection_status IS NULL;
            
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
      `);
      
      console.log('Creating slack_channels table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_channels (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          channel_id VARCHAR NOT NULL,
          config_id INTEGER NOT NULL REFERENCES slack_configs(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          is_private BOOLEAN DEFAULT FALSE,
          last_synced_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log('Creating slack_channels indexes...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_channels' AND indexname = 'slack_channels_config_idx') THEN
            CREATE INDEX slack_channels_config_idx ON slack_channels (config_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_channels' AND indexname = 'slack_channels_user_idx') THEN
            CREATE INDEX slack_channels_user_idx ON slack_channels (user_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_channels' AND indexname = 'slack_channels_channel_id_idx') THEN
            CREATE INDEX slack_channels_channel_id_idx ON slack_channels (channel_id);
          END IF;
        END$$;
      `);
      
      console.log('Creating slack_messages table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_messages (
          id SERIAL PRIMARY KEY,
          channel_id INTEGER NOT NULL REFERENCES slack_channels(id) ON DELETE CASCADE,
          message_id VARCHAR NOT NULL,
          user_id INTEGER NOT NULL,
          posted_at TIMESTAMP NOT NULL,
          text TEXT,
          sender VARCHAR,
          sender_name VARCHAR,
          attachments JSONB,
          reactions JSONB,
          thread_ts VARCHAR,
          parent_message_id INTEGER REFERENCES slack_messages(id) ON DELETE SET NULL,
          raw_data JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log('Creating slack_messages indexes...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_channel_idx') THEN
            CREATE INDEX slack_messages_channel_idx ON slack_messages (channel_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_user_idx') THEN
            CREATE INDEX slack_messages_user_idx ON slack_messages (user_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_message_id_idx') THEN
            CREATE INDEX slack_messages_message_id_idx ON slack_messages (message_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_thread_idx') THEN
            CREATE INDEX slack_messages_thread_idx ON slack_messages (thread_ts);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_parent_idx') THEN
            CREATE INDEX slack_messages_parent_idx ON slack_messages (parent_message_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_messages' AND indexname = 'slack_messages_posted_at_idx') THEN
            CREATE INDEX slack_messages_posted_at_idx ON slack_messages (posted_at);
          END IF;
        END$$;
      `);
      
      console.log('Creating slack_webhooks table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_webhooks (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL REFERENCES slack_configs(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          webhook_id VARCHAR NOT NULL,
          channel_id VARCHAR NOT NULL,
          webhook_url VARCHAR NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log('Creating slack_webhooks indexes...');
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_webhooks' AND indexname = 'slack_webhooks_config_idx') THEN
            CREATE INDEX slack_webhooks_config_idx ON slack_webhooks (config_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_webhooks' AND indexname = 'slack_webhooks_user_idx') THEN
            CREATE INDEX slack_webhooks_user_idx ON slack_webhooks (user_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'slack_webhooks' AND indexname = 'slack_webhooks_is_active_idx') THEN
            CREATE INDEX slack_webhooks_is_active_idx ON slack_webhooks (is_active);
          END IF;
        END$$;
      `);
      
      console.log('Committing transaction...');
      await client.query('COMMIT');
      
      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Error during migration, rolling back:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});