import { EnhancedExecutor } from '../../src/executor/EnhancedExecutor';
import { ModelRouter } from '../../src/models/ModelRouter';
import { ToolRegistry } from '../../src/tools/ToolRegistry';
import { Task } from '../../src/types';

describe('EnhancedExecutor', () => {
  let executor: EnhancedExecutor;
  let modelRouter: ModelRouter;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    modelRouter = new ModelRouter();
    toolRegistry = new ToolRegistry();
    executor = new EnhancedExecutor(modelRouter, toolRegistry);
  });

  describe('Task Execution', () => {
    test('should execute simple tasks', async () => {
      const task: Task = {
        id: 'test-1',
        description: 'List files in current directory',
        status: 'pending',
        priority: 1,
        dependencies: [],
        acceptanceCriteria: ['Files are listed'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeTask(task, 'Test context');
      expect(result).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThanOrEqual(0);
    }, 60000);

    test('should handle task failures gracefully', async () => {
      const task: Task = {
        id: 'test-2',
        description: 'Impossible task that cannot be completed',
        status: 'pending',
        priority: 1,
        dependencies: [],
        acceptanceCriteria: ['This is impossible to achieve'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeTask(task, 'Test context');
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    }, 60000);

    test('should track tool calls', async () => {
      const task: Task = {
        id: 'test-3',
        description: 'Read a file',
        status: 'pending',
        priority: 1,
        dependencies: [],
        acceptanceCriteria: ['File content is retrieved'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeTask(task, 'Test context');
      expect(result.toolCalls).toBeDefined();
      expect(Array.isArray(result.toolCalls)).toBe(true);
    }, 60000);
  });

  describe('Cost Tracking', () => {
    test('should track execution costs', async () => {
      const task: Task = {
        id: 'test-4',
        description: 'Simple task',
        status: 'pending',
        priority: 1,
        dependencies: [],
        acceptanceCriteria: ['Task completed'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeTask(task, 'Test context');
      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Retry Logic', () => {
    test('should retry failed tasks', async () => {
      const task: Task = {
        id: 'test-5',
        description: 'Task that might fail',
        status: 'pending',
        priority: 1,
        dependencies: [],
        acceptanceCriteria: ['Task completed'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWithRetry(task, 'Test context', 2);
      expect(result).toBeDefined();
    }, 120000);
  });
});
