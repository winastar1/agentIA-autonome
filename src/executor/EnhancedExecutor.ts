import { Task, ExecutionResult, ToolCall } from '../types';
import { ModelRouter } from '../models/ModelRouter';
import { ToolRegistry } from '../tools/ToolRegistry';
import logger from '../utils/logger';
import { config } from '../utils/config';

export class EnhancedExecutor {
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

Use the available tools to complete this task. Think step by step and use tools as needed.
After using tools, verify that the acceptance criteria are met before concluding.`;

    let totalTokensUsed = 0;
    let totalCost = 0;
    const toolCalls: ToolCall[] = [];
    let attempts = 0;
    const maxAttempts = 5;
    let lastResponse = '';
    let conversationHistory: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: 'You are an autonomous AI agent that executes tasks using available tools. Be thorough and complete all acceptance criteria. After using tools, analyze the results and determine if the task is complete.',
      },
      { role: 'user', content: prompt },
    ];

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await this.modelRouter.chat(
          conversationHistory,
          'general',
          {
            temperature: 0.7,
            tools: toolDefinitions,
          }
        );

        totalTokensUsed += response.tokensUsed;
        totalCost += response.cost;
        lastResponse = response.content;

        if (totalCost > config.agent.maxCostPerSession) {
          logger.warn('Cost limit exceeded during task execution', {
            taskId: task.id,
            totalCost,
            limit: config.agent.maxCostPerSession,
          });
          return {
            success: false,
            output: null,
            error: `Cost limit exceeded: $${totalCost.toFixed(4)} > $${config.agent.maxCostPerSession}`,
            toolCalls,
            tokensUsed: totalTokensUsed,
            cost: totalCost,
          };
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolResults: string[] = [];

          for (const toolCall of response.toolCalls) {
            const toolName = toolCall.function?.name || toolCall.name;
            const toolArgs = typeof toolCall.function?.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.arguments || toolCall.input;

            logger.info('Executing tool', { toolName, toolArgs });

            const tool = this.toolRegistry.getTool(toolName);
            if (!tool) {
              logger.error('Tool not found', { toolName });
              toolResults.push(`Error: Tool '${toolName}' not found`);
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

              const resultSummary = JSON.stringify(result).substring(0, 500);
              toolResults.push(`Tool '${toolName}' result: ${resultSummary}`);

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
              toolResults.push(`Tool '${toolName}' error: ${error.message}`);
            }
          }

          conversationHistory.push({
            role: 'assistant',
            content: `I used the following tools: ${response.toolCalls.map(tc => tc.function?.name || tc.name).join(', ')}`,
          });
          conversationHistory.push({
            role: 'user',
            content: `Tool execution results:\n${toolResults.join('\n\n')}\n\nBased on these results, have all acceptance criteria been met? If yes, provide a summary. If no, continue with the next step.`,
          });

          continue;
        }

        if (response.content && response.content.length > 0) {
          const verificationPrompt = `Task: ${task.description}

Acceptance Criteria:
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Tool calls made: ${toolCalls.length}
Last response: ${response.content}

Have ALL acceptance criteria been met? Respond with:
- "COMPLETE: [brief summary]" if all criteria are met
- "INCOMPLETE: [what's missing]" if any criteria are not met`;

          const verificationResponse = await this.modelRouter.chat(
            [
              {
                role: 'system',
                content: 'You are a task verifier. Analyze if all acceptance criteria have been met.',
              },
              { role: 'user', content: verificationPrompt },
            ],
            'fast',
            { temperature: 0.3 }
          );

          totalTokensUsed += verificationResponse.tokensUsed;
          totalCost += verificationResponse.cost;

          if (verificationResponse.content.toUpperCase().startsWith('COMPLETE')) {
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
          } else if (attempts >= maxAttempts) {
            logger.warn('Task incomplete after max attempts', {
              taskId: task.id,
              verification: verificationResponse.content,
            });

            return {
              success: false,
              output: response.content,
              error: `Task incomplete after ${maxAttempts} attempts: ${verificationResponse.content}`,
              toolCalls,
              tokensUsed: totalTokensUsed,
              cost: totalCost,
            };
          }

          conversationHistory.push({
            role: 'assistant',
            content: response.content,
          });
          conversationHistory.push({
            role: 'user',
            content: `Verification result: ${verificationResponse.content}\n\nPlease continue working on the task.`,
          });
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

        conversationHistory.push({
          role: 'user',
          content: `An error occurred: ${error.message}. Please try a different approach.`,
        });
      }
    }

    return {
      success: false,
      output: lastResponse,
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
