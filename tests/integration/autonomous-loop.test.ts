import { Orchestrator } from '../../src/core/Orchestrator';
import { db } from '../../src/database/client';

describe('Autonomous Loop Integration Tests', () => {
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Complete Autonomous Loop', () => {
    test('should complete a simple directive end-to-end', async () => {
      const directive = 'List the files in the current directory';
      
      const completionPromise = new Promise((resolve) => {
        orchestrator.on('plan_completed', resolve);
        orchestrator.on('agent_stopped', resolve);
      });

      await orchestrator.processDirective(directive);
      
      await Promise.race([
        completionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000))
      ]);

      const state = orchestrator.getState();
      expect(state.iterationCount).toBeGreaterThan(0);
      expect(state.totalTokensUsed).toBeGreaterThan(0);
    }, 150000);

    test('should handle multiple directives sequentially', async () => {
      const directive1 = 'Echo hello world';
      const directive2 = 'List current directory';

      await orchestrator.processDirective(directive1);
      const state1 = orchestrator.getState();
      expect(state1.iterationCount).toBeGreaterThan(0);

      await orchestrator.processDirective(directive2);
      const state2 = orchestrator.getState();
      expect(state2.iterationCount).toBeGreaterThan(0);
    }, 180000);
  });

  describe('Memory Persistence', () => {
    test('should persist memories across iterations', async () => {
      const directive = 'Remember that my favorite color is blue';
      
      await orchestrator.processDirective(directive);
      
      const memoryManager = orchestrator.getMemoryManager();
      const episodic = await memoryManager.getEpisodicMemory(10);
      
      expect(episodic.length).toBeGreaterThan(0);
    }, 120000);
  });

  describe('Error Handling', () => {
    test('should handle invalid directives gracefully', async () => {
      const directive = '';
      
      await expect(orchestrator.processDirective(directive)).resolves.not.toThrow();
    }, 60000);

    test('should stop when requested', async () => {
      const directive = 'Count to one million';
      
      orchestrator.processDirective(directive);
      
      setTimeout(() => {
        orchestrator.stop();
      }, 5000);

      await new Promise(resolve => setTimeout(resolve, 6000));
      
      expect(orchestrator.isAgentRunning()).toBe(false);
    }, 10000);
  });

  describe('Cost Tracking', () => {
    test('should track costs accurately', async () => {
      const directive = 'Echo test';
      
      await orchestrator.processDirective(directive);
      
      const state = orchestrator.getState();
      expect(state.totalCost).toBeGreaterThanOrEqual(0);
      expect(state.totalTokensUsed).toBeGreaterThan(0);
    }, 120000);
  });
});
