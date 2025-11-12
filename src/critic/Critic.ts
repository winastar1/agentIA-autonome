import { Reflection, ExecutionResult, Task } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import logger from '../utils/logger';

export class Critic {
  constructor(private modelRouter: ModelRouter) {}

  async reflect(
    task: Task,
    executionResult: ExecutionResult,
    context: string
  ): Promise<Reflection> {
    logger.info('Performing reflection on task execution', { taskId: task.id });

    const prompt = `You are a critical evaluator analyzing the execution of a task. Provide honest, constructive feedback.

Task: ${task.description}

Acceptance Criteria:
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Execution Result:
- Success: ${executionResult.success}
- Output: ${JSON.stringify(executionResult.output, null, 2)}
- Tools Used: ${executionResult.toolCalls.length}
- Error: ${executionResult.error || 'None'}

Context: ${context}

Evaluate the execution and provide:
1. Overall evaluation (did it meet acceptance criteria?)
2. Success metrics (0-1 scale for each criterion)
3. Issues identified
4. Suggested improvements
5. Whether replanning is needed
6. Key learnings for future tasks

Format as JSON:
{
  "evaluation": "detailed evaluation",
  "successMetrics": {"criterion1": 0.8, "criterion2": 1.0},
  "issuesIdentified": ["issue1", "issue2"],
  "suggestedImprovements": ["improvement1", "improvement2"],
  "shouldReplan": false,
  "learnings": ["learning1", "learning2"]
}`;

    try {
      const response = await this.modelRouter.chat(
        [
          {
            role: 'system',
            content: 'You are a critical evaluator that provides honest, constructive feedback on task execution.',
          },
          { role: 'user', content: prompt },
        ],
        'reasoning',
        { temperature: 0.3 }
      );

      const reflectionData = JSON.parse(response.content);

      const reflection: Reflection = {
        evaluation: reflectionData.evaluation,
        successMetrics: reflectionData.successMetrics || {},
        issuesIdentified: reflectionData.issuesIdentified || [],
        suggestedImprovements: reflectionData.suggestedImprovements || [],
        shouldReplan: reflectionData.shouldReplan || false,
        learnings: reflectionData.learnings || [],
        timestamp: new Date(),
      };

      logger.info('Reflection completed', {
        taskId: task.id,
        shouldReplan: reflection.shouldReplan,
        issuesCount: reflection.issuesIdentified.length,
      });

      return reflection;
    } catch (error: any) {
      logger.error('Reflection failed', { error: error.message });

      return {
        evaluation: 'Reflection failed to parse properly',
        successMetrics: {},
        issuesIdentified: ['Failed to generate proper reflection'],
        suggestedImprovements: [],
        shouldReplan: false,
        learnings: [],
        timestamp: new Date(),
      };
    }
  }

  async evaluatePlanProgress(
    completedTasks: Task[],
    remainingTasks: Task[],
    objective: string
  ): Promise<{ progressScore: number; shouldContinue: boolean; feedback: string }> {
    logger.info('Evaluating plan progress', {
      completed: completedTasks.length,
      remaining: remainingTasks.length,
    });

    const prompt = `Evaluate the progress toward completing an objective.

Objective: ${objective}

Completed Tasks: ${completedTasks.length}
${completedTasks.map(t => `- ${t.description} (${t.status})`).join('\n')}

Remaining Tasks: ${remainingTasks.length}
${remainingTasks.map(t => `- ${t.description}`).join('\n')}

Provide:
1. Progress score (0-1)
2. Whether to continue with current plan
3. Feedback on progress

Format as JSON:
{
  "progressScore": 0.7,
  "shouldContinue": true,
  "feedback": "detailed feedback"
}`;

    try {
      const response = await this.modelRouter.chat(
        [
          {
            role: 'system',
            content: 'You are an evaluator assessing progress toward objectives.',
          },
          { role: 'user', content: prompt },
        ],
        'reasoning',
        { temperature: 0.3 }
      );

      const evaluation = JSON.parse(response.content);

      logger.info('Plan progress evaluated', {
        progressScore: evaluation.progressScore,
        shouldContinue: evaluation.shouldContinue,
      });

      return {
        progressScore: evaluation.progressScore || 0,
        shouldContinue: evaluation.shouldContinue !== false,
        feedback: evaluation.feedback || '',
      };
    } catch (error: any) {
      logger.error('Plan evaluation failed', { error: error.message });

      return {
        progressScore: 0.5,
        shouldContinue: true,
        feedback: 'Evaluation failed, continuing with current plan',
      };
    }
  }
}
