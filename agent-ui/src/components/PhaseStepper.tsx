import { Brain, Lightbulb, Play, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseStepperProps {
  currentPhase: 'idle' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'completed';
}

const phases = [
  { id: 'thinking', label: 'Think', icon: Brain, color: 'text-blue-500' },
  { id: 'planning', label: 'Plan', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'executing', label: 'Act', icon: Play, color: 'text-green-500' },
  { id: 'reflecting', label: 'Reflect', icon: Sparkles, color: 'text-purple-500' },
];

export const PhaseStepper = ({ currentPhase }: PhaseStepperProps) => {
  const getCurrentPhaseIndex = () => {
    if (currentPhase === 'idle') return -1;
    if (currentPhase === 'completed') return 4;
    return phases.findIndex(p => p.id === currentPhase);
  };

  const currentIndex = getCurrentPhaseIndex();

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Autonomous Loop</h3>
        {currentPhase === 'completed' && (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        )}
        {currentPhase === 'idle' && (
          <span className="text-sm text-slate-400">Waiting for directive...</span>
        )}
      </div>
      
      <div className="flex items-center justify-between relative">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={phase.id} className="flex flex-col items-center flex-1 relative">
              {index < phases.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-6 left-1/2 w-full h-0.5 -z-10",
                    isCompleted ? "bg-gradient-to-r from-slate-500 to-slate-600" : "bg-slate-700"
                  )}
                />
              )}
              
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive && "border-white bg-slate-800 shadow-lg shadow-white/20 scale-110",
                  isCompleted && "border-slate-500 bg-slate-800",
                  isUpcoming && "border-slate-700 bg-slate-900"
                )}
              >
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-colors duration-300",
                    isActive && phase.color,
                    isCompleted && "text-slate-400",
                    isUpcoming && "text-slate-600"
                  )} 
                />
              </div>
              
              <span 
                className={cn(
                  "mt-2 text-sm font-medium transition-colors duration-300",
                  isActive && "text-white",
                  isCompleted && "text-slate-400",
                  isUpcoming && "text-slate-600"
                )}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
