const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database setup script for CrisisAssist
async function setupDatabase() {
  console.log('🚀 Setting up CrisisAssist database...');

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'crisisassist'
  };

  // First connect to postgres database to create crisisassist database
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    // Create database if it doesn't exist
    console.log('📦 Creating database if not exists...');
    await adminPool.query(`
      SELECT 1 FROM pg_database WHERE datname = '${dbConfig.database}'
    `).then(async (result) => {
      if (result.rows.length === 0) {
        await adminPool.query(`CREATE DATABASE ${dbConfig.database}`);
        console.log(`✅ Database '${dbConfig.database}' created successfully`);
      } else {
        console.log(`✅ Database '${dbConfig.database}' already exists`);
      }
    });
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
  } finally {
    await adminPool.end();
  }

  // Now connect to the crisisassist database
  const pool = new Pool(dbConfig);

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Read and execute schema
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database schema created successfully');

    // Read and execute seed data
    console.log('🌱 Inserting seed data...');
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seedData);
    console.log('✅ Seed data inserted successfully');

    // Verify setup
    console.log('🔍 Verifying database setup...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const alertCount = await pool.query('SELECT COUNT(*) FROM alerts');
    
    console.log(`👥 Users: ${userCount.rows[0].count}`);
    console.log(`🚨 Alerts: ${alertCount.rows[0].count}`);
    
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
