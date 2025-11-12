import { AgentState, Plan, Task, ExecutionResult, Reflection } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import { PersistentMemoryManager } from '../memory/PersistentMemoryManager';
import { Planner } from '../planner/Planner';
import { EnhancedExecutor } from '../executor/EnhancedExecutor';
import { Critic } from '../critic/Critic';
import { ToolRegistry } from '../tools/ToolRegistry';
import { config } from '../utils/config';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

export class Orchestrator extends EventEmitter {
  private state: AgentState;
  private modelRouter: ModelRouter;
  private memoryManager: PersistentMemoryManager;
  private planner: Planner;
  private executor: EnhancedExecutor;
  private critic: Critic;
  private toolRegistry: ToolRegistry;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
    this.memoryManager = new PersistentMemoryManager();
    this.toolRegistry = new ToolRegistry();
    this.planner = new Planner(this.modelRouter);
    this.executor = new EnhancedExecutor(this.modelRouter, this.toolRegistry);
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
    this.state.totalTokensUsed = 0;
    this.state.totalCost = 0;

    logger.info('Processing new directive', { directive });
    this.emit('directive_received', { directive, timestamp: new Date() });

    try {
      await this.autonomousLoop(directive);
    } catch (error: any) {
      logger.error('Error in autonomous loop', { error: error.message });
      this.state.currentPhase = 'idle';
      this.emit('error', { error: error.message, timestamp: new Date() });
    } finally {
      this.isRunning = false;
      this.emit('agent_stopped', { timestamp: new Date() });
    }
  }

  private async autonomousLoop(objective: string): Promise<void> {
    const maxIterations = config.agent.maxIterations;
    const maxExecutionTime = config.agent.maxExecutionTimeMs;
    const maxCost = config.agent.maxCostPerSession;

    await this.memoryManager.addToWorkingMemory(`New objective: ${objective}`);

    while (this.state.iterationCount < maxIterations) {
      this.state.iterationCount++;
      this.state.lastActivity = new Date();

      const elapsed = Date.now() - this.state.startTime.getTime();
      if (elapsed > maxExecutionTime) {
        logger.warn('Max execution time reached', { elapsed, maxExecutionTime });
        break;
      }

      if (this.state.totalCost > maxCost) {
        logger.warn('Max cost per session reached', { 
          totalCost: this.state.totalCost, 
          maxCost 
        });
        this.emit('cost_limit_reached', {
          totalCost: this.state.totalCost,
          maxCost,
          timestamp: new Date(),
        });
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
          this.emit('phase_changed', { phase: 'completed', timestamp: new Date() });
          this.emit('plan_completed', { 
            planId: this.state.currentPlan.id,
            iterations: this.state.iterationCount,
            totalCost: this.state.totalCost,
            totalTokens: this.state.totalTokensUsed,
            timestamp: new Date() 
          });
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
        
        await this.memoryManager.addToEpisodicMemory(
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
    this.emit('phase_changed', { phase: 'thinking', timestamp: new Date() });

    const context = await this.memoryManager.getContextSummary();
    
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

      await this.memoryManager.addToWorkingMemory(`Thinking: ${response.content}`);
      logger.info('THINK phase completed', { thoughts: response.content });
      this.emit('thinking_completed', { 
        thoughts: response.content, 
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        timestamp: new Date() 
      });
    } catch (error: any) {
      logger.error('THINK phase failed', { error: error.message });
    }
  }

  private async planPhase(objective: string): Promise<void> {
    this.state.currentPhase = 'planning';
    logger.info('PLAN phase started');
    this.emit('phase_changed', { phase: 'planning', timestamp: new Date() });

    const context = await this.memoryManager.getContextSummary();

    try {
      const plan = await this.planner.createPlan(objective, context);
      this.state.currentPlan = plan;

      await this.memoryManager.addToWorkingMemory(
        `Created plan with ${plan.tasks.length} tasks: ${plan.strategy}`
      );

      logger.info('PLAN phase completed', {
        planId: plan.id,
        taskCount: plan.tasks.length,
      });
      this.emit('plan_created', { 
        plan: {
          id: plan.id,
          objective: plan.objective,
          strategy: plan.strategy,
          taskCount: plan.tasks.length,
          tasks: plan.tasks
        },
        timestamp: new Date() 
      });
    } catch (error: any) {
      logger.error('PLAN phase failed', { error: error.message });
      throw error;
    }
  }

  private async actPhase(): Promise<void> {
    this.state.currentPhase = 'executing';
    logger.info('ACT phase started');
    this.emit('phase_changed', { phase: 'executing', timestamp: new Date() });

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
    this.emit('task_started', { 
      task: nextTask,
      timestamp: new Date() 
    });

    const context = await this.memoryManager.getContextSummary();

    try {
      const result = await this.executor.executeTask(nextTask, context);

      this.state.totalTokensUsed += result.tokensUsed;
      this.state.totalCost += result.cost;

      if (result.success) {
        this.planner.updateTaskStatus(this.state.currentPlan, nextTask.id, 'completed');
        await this.memoryManager.addToEpisodicMemory(
          `Task completed: ${nextTask.description}. Result: ${JSON.stringify(result.output)}`
        );
        logger.info('Task completed successfully', { taskId: nextTask.id });
        this.emit('task_completed', { 
          task: nextTask,
          result: result.output,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          toolCalls: result.toolCalls,
          timestamp: new Date() 
        });
      } else {
        this.planner.updateTaskStatus(this.state.currentPlan, nextTask.id, 'failed');
        await this.memoryManager.addToEpisodicMemory(
          `Task failed: ${nextTask.description}. Error: ${result.error}`
        );
        logger.warn('Task failed', { taskId: nextTask.id, error: result.error });
        this.emit('task_failed', { 
          task: nextTask,
          error: result.error,
          timestamp: new Date() 
        });
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
    this.emit('phase_changed', { phase: 'reflecting', timestamp: new Date() });

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

      await this.memoryManager.addToWorkingMemory(
        `Progress evaluation: ${evaluation.feedback} (Score: ${evaluation.progressScore})`
      );

      logger.info('REFLECT phase completed', {
        progressScore: evaluation.progressScore,
        shouldContinue: evaluation.shouldContinue,
      });
      this.emit('reflection_completed', { 
        progressScore: evaluation.progressScore,
        feedback: evaluation.feedback,
        shouldContinue: evaluation.shouldContinue,
        completedTasks: completedTasks.length,
        failedTasks: failedTasks.length,
        remainingTasks: remainingTasks.length,
        timestamp: new Date() 
      });

      if (!evaluation.shouldContinue || failedTasks.length > 3) {
        logger.info('Reflection suggests replanning');
        const context = await this.memoryManager.getContextSummary();
        const revisedPlan = await this.planner.revisePlan(
          this.state.currentPlan,
          evaluation.feedback,
          context
        );
        this.state.currentPlan = revisedPlan;
        await this.memoryManager.addToEpisodicMemory('Plan revised based on reflection');
        this.emit('plan_revised', { 
          plan: {
            id: revisedPlan.id,
            objective: revisedPlan.objective,
            strategy: revisedPlan.strategy,
            taskCount: revisedPlan.tasks.length,
            tasks: revisedPlan.tasks
          },
          reason: evaluation.feedback,
          timestamp: new Date() 
        });
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
