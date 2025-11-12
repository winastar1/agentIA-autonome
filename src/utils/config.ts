import dotenv from 'dotenv';
import { AgentConfig } from '../types';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  google: {
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/agentia',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  voice: {
    elevenlabs: process.env.ELEVENLABS_API_KEY || '',
    deepgram: process.env.DEEPGRAM_API_KEY || '',
  },
  tools: {
    tavily: process.env.TAVILY_API_KEY || '',
    serper: process.env.SERPER_API_KEY || '',
  },
  agent: {
    maxIterations: parseInt(process.env.MAX_ITERATIONS || '50'),
    maxExecutionTimeMs: parseInt(process.env.MAX_EXECUTION_TIME_MS || '300000'),
    defaultModel: process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview',
    fastModel: process.env.FAST_MODEL || 'gpt-3.5-turbo',
    reasoningModel: process.env.REASONING_MODEL || 'claude-3-opus-20240229',
    maxCostPerSession: parseFloat(process.env.MAX_COST_PER_SESSION || '10.0'),
    enablePersistentMemory: process.env.ENABLE_PERSISTENT_MEMORY !== 'false',
    enableVectorEmbeddings: process.env.ENABLE_VECTOR_EMBEDDINGS !== 'false',
  } as AgentConfig,
  security: {
    allowedShellCommands: (process.env.ALLOWED_SHELL_COMMANDS || 'ls,pwd,cat,echo,grep,find,wc,head,tail,date').split(','),
    enableShellSandbox: process.env.ENABLE_SHELL_SANDBOX !== 'false',
    maxShellExecutionTime: parseInt(process.env.MAX_SHELL_EXECUTION_TIME || '30000'),
  },
};
