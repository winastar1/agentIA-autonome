export interface Message {
  id: string;
  type: 'text' | 'system';
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentStatus {
  phase: 'idle' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'completed';
  isRunning: boolean;
  iterationCount: number;
  totalCost: number;
  totalTokensUsed: number;
  currentPlan?: {
    id: string;
    objective: string;
    taskCount: number;
    completedTasks: number;
  };
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  acceptanceCriteria: string[];
  dependencies: string[];
}

export interface Plan {
  id: string;
  objective: string;
  strategy: string;
  taskCount: number;
  tasks: Task[];
}

export interface MemoryItem {
  id: string;
  type: string;
  content: string;
  metadata: Record<string, any>;
  importance: number;
  timestamp: string;
}

export interface Memory {
  working: (string | MemoryItem)[];
  episodic: (string | MemoryItem)[];
  summary: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export interface PhaseData {
  phase: string;
  timestamp: Date;
}

export interface ThinkingData {
  thoughts: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
}

export interface TaskEvent {
  task: Task;
  result?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  toolCalls?: any[];
  timestamp: Date;
}

export interface ReflectionData {
  progressScore: number;
  feedback: string;
  shouldContinue: boolean;
  completedTasks: number;
  failedTasks: number;
  remainingTasks: number;
  timestamp: Date;
}
