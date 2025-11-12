import { Brain, Clock, FileText } from 'lucide-react';
import { Memory } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MemoryPanelProps {
  memory: Memory;
}

export const MemoryPanel = ({ memory }: MemoryPanelProps) => {
  return (
    <div className="h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Agent Memory
        </h3>
      </div>

      <Tabs defaultValue="working" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 bg-slate-800">
          <TabsTrigger value="working" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Working
          </TabsTrigger>
          <TabsTrigger value="episodic" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Episodic
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="working" className="flex-1 mt-0">
          <ScrollArea className="h-full p-4">
            {memory.working.length === 0 ? (
              <p className="text-sm text-slate-500">No working memory yet</p>
            ) : (
              <div className="space-y-2">
                {memory.working.map((item, index) => {
                  const content = typeof item === 'string' ? item : item.content;
                  return (
                    <div key={index} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-sm text-slate-300">{content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="episodic" className="flex-1 mt-0">
          <ScrollArea className="h-full p-4">
            {memory.episodic.length === 0 ? (
              <p className="text-sm text-slate-500">No episodic memory yet</p>
            ) : (
              <div className="space-y-2">
                {memory.episodic.map((item, index) => {
                  const content = typeof item === 'string' ? item : item.content;
                  return (
                    <div key={index} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Entry #{index + 1}</p>
                      <p className="text-sm text-slate-300">{content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 mt-0">
          <ScrollArea className="h-full p-4">
            {memory.summary ? (
              <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{memory.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No summary available yet</p>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
