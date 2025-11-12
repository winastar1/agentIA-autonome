import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import { config } from '../utils/config';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseClient {
  private static instance: DatabaseClient;
  private pool: Pool;
  private redis: Redis;
  private isInitialized: boolean = false;

  private constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.pool.query('SELECT NOW()');
      logger.info('PostgreSQL connection established');

      await this.redis.ping();
      logger.info('Redis connection established');

      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(schema);
        logger.info('Database schema initialized');
      }

      this.isInitialized = true;
    } catch (error: any) {
      logger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { duration, rows: result.rowCount });
      return result;
    } catch (error: any) {
      logger.error('Query failed', { error: error.message, query: text });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  getRedis(): Redis {
    return this.redis;
  }

  async close(): Promise<void> {
    await this.pool.end();
    await this.redis.quit();
    logger.info('Database connections closed');
  }

  async healthCheck(): Promise<{ postgres: boolean; redis: boolean }> {
    try {
      await this.pool.query('SELECT 1');
      const postgresHealthy = true;
      
      await this.redis.ping();
      const redisHealthy = true;

      return { postgres: postgresHealthy, redis: redisHealthy };
    } catch (error) {
      return { postgres: false, redis: false };
    }
  }
}

export const db = DatabaseClient.getInstance();
