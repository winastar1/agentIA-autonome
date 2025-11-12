import { Activity, DollarSign, Zap, Cpu } from 'lucide-react';
import { AgentStatus } from '../types';
import { Badge } from '@/components/ui/badge';

interface StatusBarProps {
  status: AgentStatus;
  isConnected: boolean;
}

export const StatusBar = ({ status, isConnected }: StatusBarProps) => {
  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (status.isRunning) return 'bg-green-500 animate-pulse';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (status.isRunning) return 'Running';
    return 'Idle';
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium text-white">{getStatusText()}</span>
          </div>
          
          {status.currentPlan && (
            <Badge variant="outline" className="text-xs">
              Plan: {status.currentPlan.completedTasks}/{status.currentPlan.taskCount} tasks
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4" />
            <span>Iteration: {status.iterationCount}</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4" />
            <span>{status.totalTokensUsed.toLocaleString()} tokens</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-300">
            <DollarSign className="w-4 h-4" />
            <span>${status.totalCost.toFixed(4)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Cpu className="w-3 h-3 mr-1" />
              Multi-AI
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
