import { CheckCircle, Circle, XCircle, Clock } from 'lucide-react';
import { Task } from '../types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  planObjective?: string;
}

export const TaskList = ({ tasks, planObjective }: TaskListProps) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    const variants: Record<Task['status'], string> = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };

    return (
      <Badge variant="outline" className={cn('text-xs', variants[status])}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Current Plan</h3>
        {planObjective && (
          <p className="text-sm text-slate-400 mt-1">{planObjective}</p>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {tasks.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <p>No active plan. Send a directive to start!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  task.status === 'in_progress' && 'border-blue-500 bg-blue-500/5',
                  task.status === 'completed' && 'border-slate-700 bg-slate-800/50 opacity-75',
                  task.status === 'failed' && 'border-red-500 bg-red-500/5',
                  task.status === 'pending' && 'border-slate-700 bg-slate-800'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(task.status)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                      {getStatusBadge(task.status)}
                    </div>
                    
                    <p className="text-sm text-white mb-2">{task.description}</p>
                    
                    {task.acceptanceCriteria.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Acceptance Criteria:</p>
                        <ul className="text-xs text-slate-500 space-y-1">
                          {task.acceptanceCriteria.map((criteria, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-slate-600">•</span>
                              <span>{criteria}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
