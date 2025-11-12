import { AgentState, Plan, Task, ExecutionResult, Reflection } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import { MemoryManager } from '../memory/MemoryManager';
import { Planner } from '../planner/Planner';
import { Executor } from '../executor/Executor';
import { Critic } from '../critic/Critic';
import { ToolRegistry } from '../tools/ToolRegistry';
import { config } from '../utils/config';
import logger from '../utils/logger';

export class Orchestrator {
  private state: AgentState;
  private modelRouter: ModelRouter;
  private memoryManager: MemoryManager;
  private planner: Planner;
  private executor: Executor;
  private critic: Critic;
  private toolRegistry: ToolRegistry;
  private isRunning: boolean = false;

  constructor() {
    this.modelRouter = new ModelRouter();
    this.memoryManager = new MemoryManager();
    this.toolRegistry = new ToolRegistry();
    this.planner = new Planner(this.modelRouter);
    this.executor = new Executor(this.modelRouter, this.toolRegistry);
    this.critic = new Critic(this.modelRouter);

    this.state = {
      currentPhase: 'idle',
      workingMemory: [],
      iterationCount: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      totalTokensUsed: 0,
      totalCost: 0,
    };

    logger.info('Orchestrator initialized');
  }

  async processDirective(directive: string): Promise<void> {
    if (this.isRunning) {
      logger.warn('Agent is already running, queuing directive');
      return;
    }

    this.isRunning = true;
    this.state.currentPhase = 'thinking';
    this.state.startTime = new Date();
    this.state.iterationCount = 0;

    logger.info('Processing new directive', { directive });

    try {
      await this.autonomousLoop(directive);
    } catch (error: any) {
      logger.error('Error in autonomous loop', { error: error.message });
      this.state.currentPhase = 'idle';
    } finally {
      this.isRunning = false;
    }
  }

  private async autonomousLoop(objective: string): Promise<void> {
    const maxIterations = config.agent.maxIterations;
    const maxExecutionTime = config.agent.maxExecutionTimeMs;

    this.memoryManager.addToWorkingMemory(`New objective: ${objective}`);

    while (this.state.iterationCount < maxIterations) {
      this.state.iterationCount++;
      this.state.lastActivity = new Date();

      const elapsed = Date.now() - this.state.startTime.getTime();
      if (elapsed > maxExecutionTime) {
        logger.warn('Max execution time reached', { elapsed, maxExecutionTime });
        break;
      }

      logger.info('Starting iteration', { 
        iteration: this.state.iterationCount,
        phase: this.state.currentPhase 
      });

      try {
        await this.thinkPhase(objective);

        if (!this.state.currentPlan || this.state.currentPhase === 'planning') {
          await this.planPhase(objective);
        }

        if (this.state.currentPlan && this.planner.isPlanComplete(this.state.currentPlan)) {
          logger.info('Plan completed successfully');
          this.state.currentPhase = 'completed';
          break;
        }

        await this.actPhase();

        await this.reflectPhase();

        if (this.state.iterationCount % 10 === 0) {
          this.memoryManager.consolidate();
        }

      } catch (error: any) {
        logger.error('Error in iteration', { 
          iteration: this.state.iterationCount,
          error: error.message 
        });
        
        this.memoryManager.addToEpisodicMemory(
          `Error in iteration ${this.state.iterationCount}: ${error.message}`
        );
      }
    }

    if (this.state.iterationCount >= maxIterations) {
      logger.warn('Max iterations reached', { maxIterations });
    }

    this.state.currentPhase = 'completed';
    logger.info('Autonomous loop completed', {
      iterations: this.state.iterationCount,
      totalCost: this.state.totalCost,
      totalTokens: this.state.totalTokensUsed,
    });
  }

  private async thinkPhase(objective: string): Promise<void> {
    this.state.currentPhase = 'thinking';
    logger.info('THINK phase started');

    const context = this.memoryManager.getContextSummary();
    
    const thinkingPrompt = `You are an autonomous AI agent. Think deeply about the current situation and decide on the best course of action.

Objective: ${objective}

Current Context:
${context}

Current Plan Status: ${this.state.currentPlan ? 'Plan exists' : 'No plan yet'}
${this.state.currentPlan ? `Tasks completed: ${this.state.currentPlan.tasks.filter(t => t.status === 'completed').length}/${this.state.currentPlan.tasks.length}` : ''}

Think about:
1. What has been accomplished so far?
2. What needs to be done next?
3. Are there any obstacles or issues?
4. Should the plan be revised?

Provide your thoughts in 2-3 sentences.`;

    try {
      const response = await this.modelRouter.chat(
        [
          {
            role: 'system',
            content: 'You are an autonomous AI agent that thinks deeply about tasks and makes strategic decisions.',
          },
          { role: 'user', content: thinkingPrompt },
        ],
        'reasoning',
        { temperature: 0.7 }
      );

      this.state.totalTokensUsed += response.tokensUsed;
      this.state.totalCost += response.cost;

      this.memoryManager.addToWorkingMemory(`Thinking: ${response.content}`);
      logger.info('THINK phase completed', { thoughts: response.content });
    } catch (error: any) {
      logger.error('THINK phase failed', { error: error.message });
    }
  }

  private async planPhase(objective: string): Promise<void> {
    this.state.currentPhase = 'planning';
    logger.info('PLAN phase started');

    const context = this.memoryManager.getContextSummary();

    try {
      const plan = await this.planner.createPlan(objective, context);
      this.state.currentPlan = plan;

      this.memoryManager.addToWorkingMemory(
        `Created plan with ${plan.tasks.length} tasks: ${plan.strategy}`
      );

      logger.info('PLAN phase completed', {
        planId: plan.id,
        taskCount: plan.tasks.length,
      });
    } catch (error: any) {
      logger.error('PLAN phase failed', { error: error.message });
      throw error;
    }
  }

  private async actPhase(): Promise<void> {
    this.state.currentPhase = 'executing';
    logger.info('ACT phase started');

    if (!this.state.currentPlan) {
      logger.warn('No plan available for execution');
      return;
    }

    const nextTask = this.planner.getNextTask(this.state.currentPlan);
    
    if (!nextTask) {
      logger.info('No tasks available for execution');
      return;
    }

    this.state.currentTask = nextTask;
    this.planner.updateTaskStatus(this.state.currentPlan, nextTask.id, 'in_progress');

    logger.info('Executing task', { 
      taskId: nextTask.id, 
      description: nextTask.description 
    });

    const context = this.memoryManager.getContextSummary();

    try {
      const result = await this.executor.executeTask(nextTask, context);

      this.state.totalTokensUsed += result.tokensUsed;
      this.state.totalCost += result.cost;

      if (result.success) {
        this.planner.updateTaskStatus(this.state.currentPlan, nextTask.id, 'completed');
        this.memoryManager.addToEpisodicMemory(
          `Task completed: ${nextTask.description}. Result: ${JSON.stringify(result.output)}`
        );
        logger.info('Task completed successfully', { taskId: nextTask.id });
      } else {
        this.planner.updateTaskStatus(this.state.currentPlan, nextTask.id, 'failed');
        this.memoryManager.addToEpisodicMemory(
          `Task failed: ${nextTask.description}. Error: ${result.error}`
        );
        logger.warn('Task failed', { taskId: nextTask.id, error: result.error });
      }

      this.state.currentTask = undefined;
    } catch (error: any) {
      logger.error('ACT phase failed', { error: error.message });
      if (this.state.currentTask) {
        this.planner.updateTaskStatus(
          this.state.currentPlan,
          this.state.currentTask.id,
          'failed'
        );
      }
    }
  }

  private async reflectPhase(): Promise<void> {
    this.state.currentPhase = 'reflecting';
    logger.info('REFLECT phase started');

    if (!this.state.currentPlan) {
      return;
    }

    const completedTasks = this.state.currentPlan.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.state.currentPlan.tasks.filter(t => t.status === 'failed');
    const remainingTasks = this.state.currentPlan.tasks.filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    );

    if (completedTasks.length === 0 && failedTasks.length === 0) {
      return;
    }

    try {
      const evaluation = await this.critic.evaluatePlanProgress(
        completedTasks,
        remainingTasks,
        this.state.currentPlan.objective
      );

      this.memoryManager.addToWorkingMemory(
        `Progress evaluation: ${evaluation.feedback} (Score: ${evaluation.progressScore})`
      );

      logger.info('REFLECT phase completed', {
        progressScore: evaluation.progressScore,
        shouldContinue: evaluation.shouldContinue,
      });

      if (!evaluation.shouldContinue || failedTasks.length > 3) {
        logger.info('Reflection suggests replanning');
        const context = this.memoryManager.getContextSummary();
        const revisedPlan = await this.planner.revisePlan(
          this.state.currentPlan,
          evaluation.feedback,
          context
        );
        this.state.currentPlan = revisedPlan;
        this.memoryManager.addToEpisodicMemory('Plan revised based on reflection');
      }
    } catch (error: any) {
      logger.error('REFLECT phase failed', { error: error.message });
    }
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  isAgentRunning(): boolean {
    return this.isRunning;
  }

  stop(): void {
    this.isRunning = false;
    this.state.currentPhase = 'idle';
    logger.info('Agent stopped');
  }
}
