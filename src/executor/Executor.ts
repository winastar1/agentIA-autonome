import { Task, ExecutionResult, ToolCall } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import { ToolRegistry } from '../tools/ToolRegistry';
import logger from '../utils/logger';

export class Executor {
  constructor(
    private modelRouter: ModelRouter,
    private toolRegistry: ToolRegistry
  ) {}

  async executeTask(task: Task, context: string): Promise<ExecutionResult> {
    logger.info('Executing task', { taskId: task.id, description: task.description });

    const toolDefinitions = this.toolRegistry.getToolDefinitions();
    
    const prompt = `You are an autonomous AI agent executing a task. Use the available tools to complete the task.

Task: ${task.description}

Acceptance Criteria:
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Context: ${context}

Use the available tools to complete this task. Think step by step and use tools as needed.`;

    let totalTokensUsed = 0;
    let totalCost = 0;
    const toolCalls: ToolCall[] = [];
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await this.modelRouter.chat(
          [
            {
              role: 'system',
              content: 'You are an autonomous AI agent that executes tasks using available tools. Be thorough and complete all acceptance criteria.',
            },
            { role: 'user', content: prompt },
          ],
          'general',
          {
            temperature: 0.7,
            tools: toolDefinitions,
          }
        );

        totalTokensUsed += response.tokensUsed;
        totalCost += response.cost;

        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            const toolName = toolCall.function?.name || toolCall.name;
            const toolArgs = typeof toolCall.function?.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.arguments || toolCall.input;

            logger.info('Executing tool', { toolName, toolArgs });

            const tool = this.toolRegistry.getTool(toolName);
            if (!tool) {
              logger.error('Tool not found', { toolName });
              continue;
            }

            try {
              const result = await tool.execute(toolArgs);
              
              const call: ToolCall = {
                toolName,
                arguments: toolArgs,
                result,
                timestamp: new Date(),
              };
              toolCalls.push(call);

              logger.info('Tool executed successfully', { 
                toolName, 
                success: result.success 
              });
            } catch (error: any) {
              logger.error('Tool execution failed', { 
                toolName, 
                error: error.message 
              });
              
              const call: ToolCall = {
                toolName,
                arguments: toolArgs,
                error: error.message,
                timestamp: new Date(),
              };
              toolCalls.push(call);
            }
          }

          continue;
        }

        if (response.content && response.content.length > 0) {
          logger.info('Task execution completed', { 
            taskId: task.id, 
            attempts,
            toolCallsCount: toolCalls.length 
          });

          return {
            success: true,
            output: response.content,
            toolCalls,
            tokensUsed: totalTokensUsed,
            cost: totalCost,
          };
        }
      } catch (error: any) {
        logger.error('Execution attempt failed', { 
          attempt: attempts, 
          error: error.message 
        });

        if (attempts >= maxAttempts) {
          return {
            success: false,
            output: null,
            error: `Failed after ${maxAttempts} attempts: ${error.message}`,
            toolCalls,
            tokensUsed: totalTokensUsed,
            cost: totalCost,
          };
        }
      }
    }

    return {
      success: false,
      output: null,
      error: 'Max attempts reached without completion',
      toolCalls,
      tokensUsed: totalTokensUsed,
      cost: totalCost,
    };
  }

  async executeWithRetry(
    task: Task,
    context: string,
    maxRetries: number = 3
  ): Promise<ExecutionResult> {
    let lastError: string | undefined;

    for (let retry = 0; retry < maxRetries; retry++) {
      const result = await this.executeTask(task, context);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;
      logger.warn('Task execution failed, retrying', { 
        retry: retry + 1, 
        maxRetries,
        error: lastError 
      });

      await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
    }

    return {
      success: false,
      output: null,
      error: lastError || 'Failed after all retries',
      toolCalls: [],
      tokensUsed: 0,
      cost: 0,
    };
  }
}
