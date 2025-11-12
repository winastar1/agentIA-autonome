import { Memory } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class MemoryManager {
  private workingMemory: Memory[] = [];
  private episodicMemory: Memory[] = [];
  private semanticMemory: Map<string, Memory> = new Map();
  private maxWorkingMemorySize = 10;
  private maxEpisodicMemorySize = 100;

  addToWorkingMemory(content: string, metadata: Record<string, any> = {}): Memory {
    const memory: Memory = {
      id: uuidv4(),
      type: 'working',
      content,
      metadata,
      importance: 1.0,
      timestamp: new Date(),
    };

    this.workingMemory.push(memory);

    if (this.workingMemory.length > this.maxWorkingMemorySize) {
      const removed = this.workingMemory.shift();
      if (removed && removed.importance > 0.5) {
        this.addToEpisodicMemory(removed.content, removed.metadata);
      }
    }

    logger.debug('Added to working memory', { memoryId: memory.id });
    return memory;
  }

  addToEpisodicMemory(content: string, metadata: Record<string, any> = {}): Memory {
    const memory: Memory = {
      id: uuidv4(),
      type: 'episodic',
      content,
      metadata,
      importance: 0.7,
      timestamp: new Date(),
    };

    this.episodicMemory.push(memory);

    if (this.episodicMemory.length > this.maxEpisodicMemorySize) {
      this.episodicMemory.shift();
    }

    logger.debug('Added to episodic memory', { memoryId: memory.id });
    return memory;
  }

  addToSemanticMemory(content: string, metadata: Record<string, any> = {}): Memory {
    const memory: Memory = {
      id: uuidv4(),
      type: 'semantic',
      content,
      metadata,
      importance: 0.9,
      timestamp: new Date(),
    };

    this.semanticMemory.set(memory.id, memory);
    logger.debug('Added to semantic memory', { memoryId: memory.id });
    return memory;
  }

  getWorkingMemory(): Memory[] {
    return [...this.workingMemory];
  }

  getEpisodicMemory(limit: number = 10): Memory[] {
    return this.episodicMemory.slice(-limit);
  }

  searchSemanticMemory(query: string): Memory[] {
    const results: Memory[] = [];
    for (const memory of this.semanticMemory.values()) {
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(memory);
      }
    }
    return results.sort((a, b) => b.importance - a.importance);
  }

  getContextSummary(): string {
    const working = this.workingMemory.map(m => m.content).join('\n');
    const recent = this.episodicMemory.slice(-5).map(m => m.content).join('\n');
    return `Working Memory:\n${working}\n\nRecent History:\n${recent}`;
  }

  clear() {
    this.workingMemory = [];
    this.episodicMemory = [];
    this.semanticMemory.clear();
    logger.info('Memory cleared');
  }

  consolidate(): void {
    const importantMemories = this.episodicMemory.filter(m => m.importance > 0.8);
    importantMemories.forEach(m => {
      this.addToSemanticMemory(m.content, m.metadata);
    });
    logger.info('Memory consolidated', { count: importantMemories.length });
  }
}
