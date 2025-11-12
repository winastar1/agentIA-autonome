import { Memory } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/client';
import { config } from '../utils/config';
import OpenAI from 'openai';

export class PersistentMemoryManager {
  private workingMemoryCache: Memory[] = [];
  private maxWorkingMemorySize = 10;
  private openai: OpenAI | null = null;

  constructor() {
    if (config.agent.enableVectorEmbeddings && config.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  async initialize(): Promise<void> {
    try {
      if (config.agent.enablePersistentMemory) {
        await db.initialize();
        logger.info('Persistent memory initialized');
      } else {
        logger.info('Using in-memory storage only');
      }
    } catch (error: any) {
      logger.error('Failed to initialize persistent memory', { error: error.message });
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[] | undefined> {
    if (!this.openai || !config.agent.enableVectorEmbeddings) {
      return undefined;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error: any) {
      logger.error('Failed to generate embedding', { error: error.message });
      return undefined;
    }
  }

  async addToWorkingMemory(content: string, metadata: Record<string, any> = {}): Promise<Memory> {
    const memory: Memory = {
      id: uuidv4(),
      type: 'working',
      content,
      metadata,
      importance: 1.0,
      timestamp: new Date(),
    };

    this.workingMemoryCache.push(memory);

    if (config.agent.enablePersistentMemory) {
      try {
        const embedding = await this.generateEmbedding(content);
        await db.query(
          `INSERT INTO memories (id, type, content, embedding, metadata, importance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [memory.id, memory.type, memory.content, embedding ? `[${embedding.join(',')}]` : null, JSON.stringify(metadata), memory.importance, memory.timestamp]
        );
      } catch (error: any) {
        logger.error('Failed to persist working memory', { error: error.message });
      }
    }

    if (this.workingMemoryCache.length > this.maxWorkingMemorySize) {
      const removed = this.workingMemoryCache.shift();
      if (removed && removed.importance > 0.5) {
        await this.addToEpisodicMemory(removed.content, removed.metadata);
      }
    }

    logger.debug('Added to working memory', { memoryId: memory.id });
    return memory;
  }

  async addToEpisodicMemory(content: string, metadata: Record<string, any> = {}): Promise<Memory> {
    const memory: Memory = {
      id: uuidv4(),
      type: 'episodic',
      content,
      metadata,
      importance: 0.7,
      timestamp: new Date(),
    };

    if (config.agent.enablePersistentMemory) {
      try {
        const embedding = await this.generateEmbedding(content);
        await db.query(
          `INSERT INTO memories (id, type, content, embedding, metadata, importance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [memory.id, memory.type, memory.content, embedding ? `[${embedding.join(',')}]` : null, JSON.stringify(metadata), memory.importance, memory.timestamp]
        );
      } catch (error: any) {
        logger.error('Failed to persist episodic memory', { error: error.message });
      }
    }

    logger.debug('Added to episodic memory', { memoryId: memory.id });
    return memory;
  }

  async addToSemanticMemory(content: string, metadata: Record<string, any> = {}): Promise<Memory> {
    const memory: Memory = {
      id: uuidv4(),
      type: 'semantic',
      content,
      metadata,
      importance: 0.9,
      timestamp: new Date(),
    };

    if (config.agent.enablePersistentMemory) {
      try {
        const embedding = await this.generateEmbedding(content);
        await db.query(
          `INSERT INTO memories (id, type, content, embedding, metadata, importance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [memory.id, memory.type, memory.content, embedding ? `[${embedding.join(',')}]` : null, JSON.stringify(metadata), memory.importance, memory.timestamp]
        );
      } catch (error: any) {
        logger.error('Failed to persist semantic memory', { error: error.message });
      }
    }

    logger.debug('Added to semantic memory', { memoryId: memory.id });
    return memory;
  }

  async getWorkingMemory(): Promise<Memory[]> {
    if (!config.agent.enablePersistentMemory) {
      return [...this.workingMemoryCache];
    }

    try {
      const result = await db.query(
        `SELECT id, type, content, metadata, importance, created_at as timestamp
         FROM memories
         WHERE type = 'working'
         ORDER BY created_at DESC
         LIMIT $1`,
        [this.maxWorkingMemorySize]
      );
      return result.rows.map((row: any) => ({
        ...row,
        metadata: row.metadata || {},
      }));
    } catch (error: any) {
      logger.error('Failed to retrieve working memory', { error: error.message });
      return [...this.workingMemoryCache];
    }
  }

  async getEpisodicMemory(limit: number = 10): Promise<Memory[]> {
    if (!config.agent.enablePersistentMemory) {
      return [];
    }

    try {
      const result = await db.query(
        `SELECT id, type, content, metadata, importance, created_at as timestamp
         FROM memories
         WHERE type = 'episodic'
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows.map((row: any) => ({
        ...row,
        metadata: row.metadata || {},
      }));
    } catch (error: any) {
      logger.error('Failed to retrieve episodic memory', { error: error.message });
      return [];
    }
  }

  async searchSemanticMemory(query: string, limit: number = 5): Promise<Memory[]> {
    if (!config.agent.enablePersistentMemory) {
      return [];
    }

    try {
      if (config.agent.enableVectorEmbeddings && this.openai) {
        const queryEmbedding = await this.generateEmbedding(query);
        if (queryEmbedding) {
          const result = await db.query(
            `SELECT id, type, content, metadata, importance, created_at as timestamp,
                    1 - (embedding <=> $1::vector) as similarity
             FROM memories
             WHERE type = 'semantic' AND embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
            [`[${queryEmbedding.join(',')}]`, limit]
          );
          return result.rows.map((row: any) => ({
            ...row,
            metadata: row.metadata || {},
          }));
        }
      }

      const result = await db.query(
        `SELECT id, type, content, metadata, importance, created_at as timestamp
         FROM memories
         WHERE type = 'semantic' AND content ILIKE $1
         ORDER BY importance DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      return result.rows.map((row: any) => ({
        ...row,
        metadata: row.metadata || {},
      }));
    } catch (error: any) {
      logger.error('Failed to search semantic memory', { error: error.message });
      return [];
    }
  }

  async getContextSummary(): Promise<string> {
    const working = await this.getWorkingMemory();
    const recent = await this.getEpisodicMemory(5);
    
    const workingContent = working.map(m => m.content).join('\n');
    const recentContent = recent.map(m => m.content).join('\n');
    
    return `Working Memory:\n${workingContent}\n\nRecent History:\n${recentContent}`;
  }

  async clear(): Promise<void> {
    this.workingMemoryCache = [];
    
    if (config.agent.enablePersistentMemory) {
      try {
        await db.query('DELETE FROM memories');
        logger.info('Persistent memory cleared');
      } catch (error: any) {
        logger.error('Failed to clear persistent memory', { error: error.message });
      }
    }
  }

  async consolidate(): Promise<void> {
    if (!config.agent.enablePersistentMemory) {
      return;
    }

    try {
      const result = await db.query(
        `SELECT id, content, metadata
         FROM memories
         WHERE type = 'episodic' AND importance > 0.8`
      );

      for (const row of result.rows) {
        await this.addToSemanticMemory(row.content, row.metadata);
      }

      logger.info('Memory consolidated', { count: result.rows.length });
    } catch (error: any) {
      logger.error('Failed to consolidate memory', { error: error.message });
    }
  }

  async getMemoryStats(): Promise<{
    working: number;
    episodic: number;
    semantic: number;
    total: number;
  }> {
    if (!config.agent.enablePersistentMemory) {
      return {
        working: this.workingMemoryCache.length,
        episodic: 0,
        semantic: 0,
        total: this.workingMemoryCache.length,
      };
    }

    try {
      const result = await db.query(
        `SELECT type, COUNT(*) as count
         FROM memories
         GROUP BY type`
      );

      const stats = {
        working: 0,
        episodic: 0,
        semantic: 0,
        total: 0,
      };

      for (const row of result.rows) {
        stats[row.type as keyof typeof stats] = parseInt(row.count);
        stats.total += parseInt(row.count);
      }

      return stats;
    } catch (error: any) {
      logger.error('Failed to get memory stats', { error: error.message });
      return {
        working: this.workingMemoryCache.length,
        episodic: 0,
        semantic: 0,
        total: this.workingMemoryCache.length,
      };
    }
  }
}
