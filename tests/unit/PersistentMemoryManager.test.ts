import { PersistentMemoryManager } from '../../src/memory/PersistentMemoryManager';
import { db } from '../../src/database/client';

describe('PersistentMemoryManager', () => {
  let memoryManager: PersistentMemoryManager;

  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(async () => {
    memoryManager = new PersistentMemoryManager();
    await memoryManager.initialize();
    await memoryManager.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Working Memory', () => {
    test('should add to working memory', async () => {
      const memory = await memoryManager.addToWorkingMemory('Test content');
      expect(memory.id).toBeDefined();
      expect(memory.type).toBe('working');
      expect(memory.content).toBe('Test content');
    });

    test('should retrieve working memory', async () => {
      await memoryManager.addToWorkingMemory('Content 1');
      await memoryManager.addToWorkingMemory('Content 2');
      
      const memories = await memoryManager.getWorkingMemory();
      expect(memories.length).toBeGreaterThan(0);
      expect(memories.some(m => m.content === 'Content 1')).toBe(true);
    });

    test('should limit working memory size', async () => {
      for (let i = 0; i < 15; i++) {
        await memoryManager.addToWorkingMemory(`Content ${i}`);
      }
      
      const memories = await memoryManager.getWorkingMemory();
      expect(memories.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Episodic Memory', () => {
    test('should add to episodic memory', async () => {
      const memory = await memoryManager.addToEpisodicMemory('Event happened');
      expect(memory.id).toBeDefined();
      expect(memory.type).toBe('episodic');
      expect(memory.content).toBe('Event happened');
    });

    test('should retrieve episodic memory', async () => {
      await memoryManager.addToEpisodicMemory('Event 1');
      await memoryManager.addToEpisodicMemory('Event 2');
      
      const memories = await memoryManager.getEpisodicMemory(10);
      expect(memories.length).toBeGreaterThan(0);
    });
  });

  describe('Semantic Memory', () => {
    test('should add to semantic memory', async () => {
      const memory = await memoryManager.addToSemanticMemory('Important knowledge');
      expect(memory.id).toBeDefined();
      expect(memory.type).toBe('semantic');
      expect(memory.content).toBe('Important knowledge');
    });

    test('should search semantic memory', async () => {
      await memoryManager.addToSemanticMemory('JavaScript is a programming language');
      await memoryManager.addToSemanticMemory('Python is also a programming language');
      
      const results = await memoryManager.searchSemanticMemory('programming');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(m => m.content.includes('programming'))).toBe(true);
    });
  });

  describe('Memory Consolidation', () => {
    test('should consolidate important episodic memories to semantic', async () => {
      await memoryManager.addToEpisodicMemory('Very important event');
      await memoryManager.consolidate();
      
      const semantic = await memoryManager.searchSemanticMemory('important');
      expect(semantic.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Stats', () => {
    test('should return accurate memory statistics', async () => {
      await memoryManager.addToWorkingMemory('Working 1');
      await memoryManager.addToEpisodicMemory('Episodic 1');
      await memoryManager.addToSemanticMemory('Semantic 1');
      
      const stats = await memoryManager.getMemoryStats();
      expect(stats.working).toBeGreaterThan(0);
      expect(stats.episodic).toBeGreaterThan(0);
      expect(stats.semantic).toBeGreaterThan(0);
      expect(stats.total).toBe(stats.working + stats.episodic + stats.semantic);
    });
  });

  describe('Context Summary', () => {
    test('should generate context summary', async () => {
      await memoryManager.addToWorkingMemory('Current task');
      await memoryManager.addToEpisodicMemory('Past event');
      
      const summary = await memoryManager.getContextSummary();
      expect(summary).toContain('Working Memory');
      expect(summary).toContain('Recent History');
    });
  });
});
