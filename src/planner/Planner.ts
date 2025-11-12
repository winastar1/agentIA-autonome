import { Plan, Task } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class Planner {
  constructor(private modelRouter: ModelRouter) {}

  async createPlan(objective: string, context: string): Promise<Plan> {
    logger.info('Creating plan for objective', { objective });

    const prompt = `You are an expert AI planner. Create a detailed, step-by-step plan to accomplish the following objective.

Objective: ${objective}

Context: ${context}

Create a structured plan with:
1. A clear strategy
2. Specific tasks with acceptance criteria
3. Task dependencies
4. Priority levels (1-10)

Format your response as JSON with this structure:
{
  "strategy": "overall approach",
  "estimatedSteps": number,
  "tasks": [
    {
      "description": "task description",
      "priority": number,
      "dependencies": [],
      "acceptanceCriteria": ["criterion 1", "criterion 2"]
    }
  ]
}`;

    const response = await this.modelRouter.chat(
      [
        { role: 'system', content: 'You are an expert AI planner that creates detailed, actionable plans.' },
        { role: 'user', content: prompt },
      ],
      'planning',
      { temperature: 0.3 }
    );

    try {
      const planData = JSON.parse(response.content);
      
      const tasks: Task[] = planData.tasks.map((t: any) => ({
        id: uuidv4(),
        description: t.description,
        status: 'pending' as const,
        priority: t.priority || 5,
        dependencies: t.dependencies || [],
        acceptanceCriteria: t.acceptanceCriteria || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const plan: Plan = {
        id: uuidv4(),
        objective,
        tasks,
        strategy: planData.strategy,
        estimatedSteps: planData.estimatedSteps || tasks.length,
        createdAt: new Date(),
      };

      logger.info('Plan created successfully', { 
        planId: plan.id, 
        taskCount: tasks.length 
      });

      return plan;
    } catch (error) {
      logger.error('Failed to parse plan from model response', { error });
      
      return {
        id: uuidv4(),
        objective,
        tasks: [{
          id: uuidv4(),
          description: objective,
          status: 'pending',
          priority: 5,
          dependencies: [],
          acceptanceCriteria: ['Task completed successfully'],
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        strategy: 'Direct execution',
        estimatedSteps: 1,
        createdAt: new Date(),
      };
    }
  }

  async revisePlan(currentPlan: Plan, feedback: string, context: string): Promise<Plan> {
    logger.info('Revising plan', { planId: currentPlan.id });

    const prompt = `You are revising an existing plan based on new feedback.

Original Objective: ${currentPlan.objective}
Original Strategy: ${currentPlan.strategy}
Current Tasks: ${JSON.stringify(currentPlan.tasks, null, 2)}

Feedback: ${feedback}
Context: ${context}

Create a revised plan that addresses the feedback. Use the same JSON format as before.`;

    const response = await this.modelRouter.chat(
      [
        { role: 'system', content: 'You are an expert AI planner that revises plans based on feedback.' },
        { role: 'user', content: prompt },
      ],
      'planning',
      { temperature: 0.3 }
    );

    try {
      const planData = JSON.parse(response.content);
      
      const tasks: Task[] = planData.tasks.map((t: any) => ({
        id: uuidv4(),
        description: t.description,
        status: 'pending' as const,
        priority: t.priority || 5,
        dependencies: t.dependencies || [],
        acceptanceCriteria: t.acceptanceCriteria || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const revisedPlan: Plan = {
        id: uuidv4(),
        objective: currentPlan.objective,
        tasks,
        strategy: planData.strategy,
        estimatedSteps: planData.estimatedSteps || tasks.length,
        createdAt: new Date(),
      };

      logger.info('Plan revised successfully', { 
        planId: revisedPlan.id, 
        taskCount: tasks.length 
      });

      return revisedPlan;
    } catch (error) {
      logger.error('Failed to parse revised plan', { error });
      return currentPlan;
    }
  }

  getNextTask(plan: Plan): Task | null {
    const availableTasks = plan.tasks.filter(task => {
      if (task.status !== 'pending') return false;
      
      const dependenciesMet = task.dependencies.every(depId => {
        const depTask = plan.tasks.find(t => t.id === depId);
        return depTask?.status === 'completed';
      });
      
      return dependenciesMet;
    });

    if (availableTasks.length === 0) return null;

    availableTasks.sort((a, b) => b.priority - a.priority);
    return availableTasks[0];
  }

  updateTaskStatus(plan: Plan, taskId: string, status: Task['status']): void {
    const task = plan.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      logger.info('Task status updated', { taskId, status });
    }
  }

  isPlanComplete(plan: Plan): boolean {
    return plan.tasks.every(task => task.status === 'completed' || task.status === 'failed');
  }
}
