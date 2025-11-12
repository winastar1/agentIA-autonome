import express, { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Orchestrator } from '../core/Orchestrator';
import { CommunicationMessage } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class CommunicationServer {
  private app: Express;
  private server: HTTPServer;
  private wss: WebSocketServer;
  private orchestrator: Orchestrator;
  private clients: Set<WebSocket> = new Set();
  private messageHistory: CommunicationMessage[] = [];

  constructor(private port: number, orchestrator: Orchestrator) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.orchestrator = orchestrator;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes() {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/status', (req: Request, res: Response) => {
      const state = this.orchestrator.getState();
      res.json({
        phase: state.currentPhase,
        isRunning: this.orchestrator.isAgentRunning(),
        iterationCount: state.iterationCount,
        totalCost: state.totalCost,
        totalTokensUsed: state.totalTokensUsed,
        currentPlan: state.currentPlan ? {
          id: state.currentPlan.id,
          objective: state.currentPlan.objective,
          taskCount: state.currentPlan.tasks.length,
          completedTasks: state.currentPlan.tasks.filter(t => t.status === 'completed').length,
        } : null,
      });
    });

    this.app.post('/directive', async (req: Request, res: Response) => {
      const { directive } = req.body;

      if (!directive) {
        return res.status(400).json({ error: 'Directive is required' });
      }

      logger.info('Received directive via HTTP', { directive });

      const message: CommunicationMessage = {
        id: uuidv4(),
        type: 'text',
        content: directive,
        sender: 'user',
        timestamp: new Date(),
      };

      this.messageHistory.push(message);
      this.broadcast(message);

      this.orchestrator.processDirective(directive).catch(error => {
        logger.error('Error processing directive', { error: error.message });
      });

      res.json({
        success: true,
        message: 'Directive received and processing started',
        messageId: message.id,
      });
    });

    this.app.get('/messages', (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = this.messageHistory.slice(-limit);
      res.json({ messages });
    });

    this.app.get('/memory', (req: Request, res: Response) => {
      const memoryManager = this.orchestrator.getMemoryManager();
      res.json({
        working: memoryManager.getWorkingMemory(),
        episodic: memoryManager.getEpisodicMemory(20),
        summary: memoryManager.getContextSummary(),
      });
    });

    this.app.get('/tools', (req: Request, res: Response) => {
      const toolRegistry = this.orchestrator.getToolRegistry();
      const tools = toolRegistry.getAllTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        requiresApproval: tool.requiresApproval,
      }));
      res.json({ tools });
    });

    this.app.post('/stop', (req: Request, res: Response) => {
      logger.info('Stop command received');
      this.orchestrator.stop();
      res.json({ success: true, message: 'Agent stopped' });
    });

    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Autonomous AI Agent',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: 'GET /health',
          status: 'GET /status',
          directive: 'POST /directive',
          messages: 'GET /messages',
          memory: 'GET /memory',
          tools: 'GET /tools',
          stop: 'POST /stop',
          websocket: 'WS /ws',
        },
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');
      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Autonomous AI Agent',
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          logger.info('WebSocket message received', { message });

          if (message.type === 'directive' || message.type === 'text') {
            const commMessage: CommunicationMessage = {
              id: uuidv4(),
              type: 'text',
              content: message.content,
              sender: 'user',
              timestamp: new Date(),
            };

            this.messageHistory.push(commMessage);
            this.broadcast(commMessage);

            this.orchestrator.processDirective(message.content).catch(error => {
              logger.error('Error processing directive', { error: error.message });
              this.broadcast({
                id: uuidv4(),
                type: 'text',
                content: `Error: ${error.message}`,
                sender: 'agent',
                timestamp: new Date(),
              });
            });
          } else if (message.type === 'status') {
            const state = this.orchestrator.getState();
            ws.send(JSON.stringify({
              type: 'status',
              data: state,
              timestamp: new Date().toISOString(),
            }));
          }
        } catch (error: any) {
          logger.error('Error processing WebSocket message', { error: error.message });
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message,
            timestamp: new Date().toISOString(),
          }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
        this.clients.delete(ws);
      });
    });
  }

  private broadcast(message: CommunicationMessage) {
    const data = JSON.stringify({
      type: 'message',
      data: message,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public sendAgentMessage(content: string, metadata?: Record<string, any>) {
    const message: CommunicationMessage = {
      id: uuidv4(),
      type: 'text',
      content,
      sender: 'agent',
      timestamp: new Date(),
      metadata,
    };

    this.messageHistory.push(message);
    this.broadcast(message);
    logger.info('Agent message sent', { content });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info(`Communication server started on port ${this.port}`);
        logger.info(`HTTP API: http://localhost:${this.port}`);
        logger.info(`WebSocket: ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('Communication server stopped');
          resolve();
        });
      });
    });
  }
}
