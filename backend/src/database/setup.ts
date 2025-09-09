import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const createDatabase = async () => {
  // Connect to postgres database to create our database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    const dbName = process.env.DB_NAME || 'crisisassist';
    
    // Check if database exists
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      // Create database
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      logger.info(`Database ${dbName} created successfully`);
    } else {
      logger.info(`Database ${dbName} already exists`);
    }
  } catch (error) {
    logger.error('Error creating database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
};

const runMigrations = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    logger.info('Database schema created/updated successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

const seedDatabase = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Insert demo data for development
    if (process.env.NODE_ENV === 'development') {
      // Demo alerts
      await pool.query(`
        INSERT INTO alerts (id, type, severity, title, description, location_address, source, status) VALUES
        ('demo_alert_001', 'flood', 'high', 'Flash Flood Warning - Indore', 'Heavy rainfall has caused flash flooding in central Indore. Immediate evacuation recommended for low-lying areas.', 'Indore, Madhya Pradesh, India', 'National Weather Service', 'active'),
        ('demo_alert_002', 'fire', 'critical', 'Wildfire - Mumbai Outskirts', 'Large wildfire spreading rapidly near Mumbai suburbs. Multiple fire departments responding.', 'Thane, Maharashtra, India', 'Fire Department', 'active')
        ON CONFLICT (id) DO NOTHING
      `);

      // Demo events
      await pool.query(`
        INSERT INTO events (id, alert_id, title, description, start_time, end_time, location, assignees, status) VALUES
        ('demo_event_001', 'demo_alert_001', 'Emergency Relief Camp Setup', 'Setup temporary relief camp for flood victims', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '8 hours', 'Indore Community Center', ARRAY['volunteer_001', 'volunteer_002'], 'scheduled'),
        ('demo_event_002', 'demo_alert_002', 'Fire Suppression Coordination', 'Coordinate fire suppression efforts with multiple departments', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '6 hours', 'Mumbai Fire Station', ARRAY['fire_chief_001'], 'scheduled')
        ON CONFLICT (id) DO NOTHING
      `);

      logger.info('Demo data seeded successfully');
    }
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

const setupDatabase = async () => {
  try {
    logger.info('Starting database setup...');
    
    await createDatabase();
    await runMigrations();
    await seedDatabase();
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
};

// Export functions for use in scripts
export { createDatabase, runMigrations, seedDatabase, setupDatabase };

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}