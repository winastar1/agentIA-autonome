import { useState, useCallback, useEffect } from 'react';
import { PhaseStepper } from './components/PhaseStepper';
import { StatusBar } from './components/StatusBar';
import { ChatPanel } from './components/ChatPanel';
import { TaskList } from './components/TaskList';
import { MemoryPanel } from './components/MemoryPanel';
import { useWebSocket } from './hooks/useWebSocket';
import { Message, AgentStatus, Task, Memory, WebSocketMessage, Plan } from './types';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AgentStatus>({
    phase: 'idle',
    isRunning: false,
    iterationCount: 0,
    totalCost: 0,
    totalTokensUsed: 0,
  });
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [memory, setMemory] = useState<Memory>({
    working: [],
    episodic: [],
    summary: '',
  });

  const handleWebSocketMessage = useCallback((wsMessage: WebSocketMessage) => {
    console.log('WebSocket message:', wsMessage);

    switch (wsMessage.type) {
      case 'connection':
        console.log('Connected to agent');
        fetchStatus();
        fetchMemory();
        break;

      case 'message':
        if (wsMessage.data) {
          setMessages(prev => [...prev, {
            ...wsMessage.data,
            timestamp: new Date(wsMessage.data.timestamp),
          }]);
        }
        break;

      case 'phase_changed':
        setStatus(prev => ({
          ...prev,
          phase: wsMessage.data.phase,
        }));
        break;

      case 'directive_received':
        setStatus(prev => ({
          ...prev,
          isRunning: true,
        }));
        break;

      case 'thinking_completed':
        break;

      case 'plan_created':
        if (wsMessage.data.plan) {
          setCurrentPlan(wsMessage.data.plan);
          setStatus(prev => ({
            ...prev,
            currentPlan: {
              id: wsMessage.data.plan.id,
              objective: wsMessage.data.plan.objective,
              taskCount: wsMessage.data.plan.taskCount,
              completedTasks: 0,
            },
          }));
        }
        break;

      case 'plan_revised':
        if (wsMessage.data.plan) {
          setCurrentPlan(wsMessage.data.plan);
        }
        break;

      case 'task_started':
      case 'task_completed':
      case 'task_failed':
        fetchStatus();
        if (currentPlan) {
          const updatedTasks = currentPlan.tasks.map(task =>
            task.id === wsMessage.data.task.id ? wsMessage.data.task : task
          );
          setCurrentPlan({ ...currentPlan, tasks: updatedTasks });
        }
        break;

      case 'reflection_completed':
        break;

      case 'plan_completed':
        setStatus(prev => ({
          ...prev,
          phase: 'completed',
          isRunning: false,
        }));
        break;

      case 'agent_stopped':
        setStatus(prev => ({
          ...prev,
          isRunning: false,
          phase: 'idle',
        }));
        break;

      case 'error':
        console.error('Agent error:', wsMessage.data);
        break;

      case 'status':
        if (wsMessage.data) {
          setStatus({
            phase: wsMessage.data.phase || 'idle',
            isRunning: wsMessage.data.isRunning || false,
            iterationCount: wsMessage.data.iterationCount || 0,
            totalCost: wsMessage.data.totalCost || 0,
            totalTokensUsed: wsMessage.data.totalTokensUsed || 0,
            currentPlan: wsMessage.data.currentPlan,
          });
        }
        break;
    }
  }, [currentPlan]);

  const { isConnected, sendMessage } = useWebSocket(handleWebSocketMessage);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      setStatus({
        phase: data.phase || 'idle',
        isRunning: data.isRunning || false,
        iterationCount: data.iterationCount || 0,
        totalCost: data.totalCost || 0,
        totalTokensUsed: data.totalTokensUsed || 0,
        currentPlan: data.currentPlan,
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchMemory = async () => {
    try {
      const response = await fetch(`${API_URL}/memory`);
      const data = await response.json();
      setMemory(data);
    } catch (error) {
      console.error('Failed to fetch memory:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchMemory();
    
    const statusInterval = setInterval(fetchStatus, 5000);
    const memoryInterval = setInterval(fetchMemory, 10000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(memoryInterval);
    };
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      type: 'text',
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessage({
      type: 'directive',
      content,
    });
  }, [sendMessage]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Autonomous AI Agent
          </h1>
          <p className="text-slate-400 mt-2">
            Multi-Model AI System with Continuous Autonomous Operation
          </p>
        </div>

        <StatusBar status={status} isConnected={isConnected} />

        <PhaseStepper currentPhase={status.phase} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          <div className="lg:col-span-2 h-full">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isConnected={isConnected}
            />
          </div>

          <div className="h-full">
            <TaskList
              tasks={currentPlan?.tasks || []}
              planObjective={currentPlan?.objective}
            />
          </div>
        </div>

        <div className="h-[400px]">
          <MemoryPanel memory={memory} />
        </div>

        <div className="text-center text-sm text-slate-500 py-4">
          <p>Powered by OpenAI, Anthropic & Google AI • Real-time WebSocket Connection</p>
        </div>
      </div>
    </div>
  );
}

export default App;
