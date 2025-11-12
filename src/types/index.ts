export interface AgentConfig {
  maxIterations: number;
  maxExecutionTimeMs: number;
  defaultModel: string;
  fastModel: string;
  reasoningModel: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  objective: string;
  tasks: Task[];
  strategy: string;
  estimatedSteps: number;
  createdAt: Date;
}

export interface ToolCall {
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  toolCalls: ToolCall[];
  tokensUsed: number;
  cost: number;
}

export interface Reflection {
  evaluation: string;
  successMetrics: Record<string, number>;
  issuesIdentified: string[];
  suggestedImprovements: string[];
  shouldReplan: boolean;
  learnings: string[];
  timestamp: Date;
}

export interface Memory {
  id: string;
  type: 'working' | 'episodic' | 'semantic';
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  importance: number;
  timestamp: Date;
}

export interface AgentState {
  currentPhase: 'idle' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'completed';
  currentPlan?: Plan;
  currentTask?: Task;
  workingMemory: Memory[];
  iterationCount: number;
  startTime: Date;
  lastActivity: Date;
  totalTokensUsed: number;
  totalCost: number;
}

export interface ModelProvider {
  name: 'openai' | 'anthropic' | 'google' | 'local';
  available: boolean;
  costPerToken: number;
  maxTokens: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<any>;
  requiresApproval: boolean;
}

export interface VoiceConfig {
  enabled: boolean;
  provider: 'elevenlabs' | 'google' | 'azure';
  voiceId?: string;
  language: string;
}

export interface CommunicationMessage {
  id: string;
  type: 'text' | 'voice';
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  metadata?: Record<string, any>;
}
