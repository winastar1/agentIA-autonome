import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config';
import logger from '../utils/logger';
import { ModelProvider } from '../types';

export type TaskType = 'planning' | 'reasoning' | 'coding' | 'fast' | 'general';

export class ModelRouter {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  private providers: Map<string, ModelProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    if (config.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
      this.providers.set('openai', {
        name: 'openai',
        available: true,
        costPerToken: 0.00001,
        maxTokens: 128000,
      });
      logger.info('OpenAI provider initialized');
    }

    if (config.anthropic.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
      this.providers.set('anthropic', {
        name: 'anthropic',
        available: true,
        costPerToken: 0.000015,
        maxTokens: 200000,
      });
      logger.info('Anthropic provider initialized');
    }

    if (config.google.apiKey) {
      this.google = new GoogleGenerativeAI(config.google.apiKey);
      this.providers.set('google', {
        name: 'google',
        available: true,
        costPerToken: 0.000001,
        maxTokens: 1000000,
      });
      logger.info('Google AI provider initialized');
    }
  }

  selectModel(taskType: TaskType): { provider: string; model: string } {
    switch (taskType) {
      case 'reasoning':
        if (this.providers.get('anthropic')?.available) {
          return { provider: 'anthropic', model: 'claude-3-opus-20240229' };
        }
        break;
      case 'planning':
        if (this.providers.get('openai')?.available) {
          return { provider: 'openai', model: 'gpt-4-turbo-preview' };
        }
        break;
      case 'coding':
        if (this.providers.get('anthropic')?.available) {
          return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
        }
        if (this.providers.get('openai')?.available) {
          return { provider: 'openai', model: 'gpt-4-turbo-preview' };
        }
        break;
      case 'fast':
        if (this.providers.get('openai')?.available) {
          return { provider: 'openai', model: 'gpt-3.5-turbo' };
        }
        if (this.providers.get('google')?.available) {
          return { provider: 'google', model: 'gemini-pro' };
        }
        break;
      case 'general':
      default:
        if (this.providers.get('openai')?.available) {
          return { provider: 'openai', model: 'gpt-4-turbo-preview' };
        }
        break;
    }

    const fallback = this.getFallbackModel();
    logger.warn(`Preferred model for ${taskType} not available, using fallback: ${fallback.model}`);
    return fallback;
  }

  private getFallbackModel(): { provider: string; model: string } {
    if (this.providers.get('openai')?.available) {
      return { provider: 'openai', model: 'gpt-3.5-turbo' };
    }
    if (this.providers.get('anthropic')?.available) {
      return { provider: 'anthropic', model: 'claude-3-haiku-20240307' };
    }
    if (this.providers.get('google')?.available) {
      return { provider: 'google', model: 'gemini-pro' };
    }
    throw new Error('No AI providers available');
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    taskType: TaskType = 'general',
    options: { temperature?: number; maxTokens?: number; tools?: any[] } = {}
  ): Promise<{ content: string; tokensUsed: number; cost: number; toolCalls?: any[] }> {
    const { provider, model } = this.selectModel(taskType);
    logger.info(`Using ${provider}/${model} for ${taskType} task`);

    try {
      switch (provider) {
        case 'openai':
          return await this.chatOpenAI(messages, model, options);
        case 'anthropic':
          return await this.chatAnthropic(messages, model, options);
        case 'google':
          return await this.chatGoogle(messages, model, options);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      logger.error(`Error with ${provider}/${model}:`, error);
      if (provider !== 'openai') {
        logger.info('Attempting fallback to OpenAI');
        return await this.chatOpenAI(messages, 'gpt-3.5-turbo', options);
      }
      throw error;
    }
  }

  private async chatOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: any
  ): Promise<{ content: string; tokensUsed: number; cost: number; toolCalls?: any[] }> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const response = await this.openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      tools: options.tools,
    });

    const content = response.choices[0]?.message?.content || '';
    const toolCalls = response.choices[0]?.message?.tool_calls;
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = tokensUsed * 0.00001;

    return { content, tokensUsed, cost, toolCalls: toolCalls as any };
  }

  private async chatAnthropic(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: any
  ): Promise<{ content: string; tokensUsed: number; cost: number; toolCalls?: any[] }> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      tools: options.tools,
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const toolCalls = response.content.filter((c: any) => c.type === 'tool_use');
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const cost = tokensUsed * 0.000015;

    return { content, tokensUsed, cost, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  private async chatGoogle(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: any
  ): Promise<{ content: string; tokensUsed: number; cost: number }> {
    if (!this.google) throw new Error('Google AI not initialized');

    const genModel = this.google.getGenerativeModel({ model });
    const chat = genModel.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const content = response.text();
    const tokensUsed = 1000;
    const cost = tokensUsed * 0.000001;

    return { content, tokensUsed, cost };
  }

  getAvailableProviders(): ModelProvider[] {
    return Array.from(this.providers.values()).filter(p => p.available);
  }
}
