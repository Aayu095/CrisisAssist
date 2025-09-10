const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Running database migrations...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of executed migrations
    const executedMigrations = await client.query('SELECT filename FROM migrations ORDER BY id');
    const executedFiles = executedMigrations.rows.map(row => row.filename);

    // Read migration files
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    let migrationFiles = [];
    
    if (fs.existsSync(migrationsDir)) {
      migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    }

    // If no migration files exist, run the main schema
    if (migrationFiles.length === 0) {
      const schemaPath = path.join(__dirname, 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log('📄 Running main schema...');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);
        
        // Record this as a migration
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
          ['schema.sql']
        );
        console.log('✅ Main schema executed');
      }
    } else {
      // Run pending migrations
      for (const file of migrationFiles) {
        if (!executedFiles.includes(file)) {
          console.log(`📄 Running migration: ${file}`);
          const migrationPath = path.join(migrationsDir, file);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          await client.query(migration);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
          console.log(`✅ Migration completed: ${file}`);
        }
      }
    }

    // Verify critical tables exist
    const tables = ['users', 'agents', 'alerts', 'events', 'messages', 'audit_logs'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Critical table '${table}' does not exist`);
      }
    }

    client.release();
    console.log('🎉 Database migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };