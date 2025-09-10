import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

export const connectDatabase = async (): Promise<Pool> => {
  if (pool) {
    return pool;
  }

  try {
    // Check if DATABASE_URL is provided
    if (!process.env.DATABASE_URL) {
      if (process.env.DEMO_MODE === 'true') {
        logger.warn('DATABASE_URL not provided, running in demo mode without database');
        // Create a mock pool for demo mode
        return {} as Pool;
      } else {
        throw new Error('DATABASE_URL environment variable is required');
      }
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection established successfully');
    
    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    if (process.env.DEMO_MODE === 'true') {
      logger.warn('Database connection failed, continuing in demo mode');
      return {} as Pool;
    }
    throw error;
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  if (process.env.DEMO_MODE === 'true' && (!pool || Object.keys(pool).length === 0)) {
    logger.debug('Demo mode: Skipping database query', { query: text });
    return { rows: [], rowCount: 0 };
  }
  
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { 
      query: text, 
      duration: `${duration}ms`, 
      rows: result.rowCount 
    });
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { query: text, error });
    throw error;
  } finally {
    client.release();
  }
};

export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};