import { Orchestrator } from './core/Orchestrator';
import { CommunicationServer } from './communication/Server';
import { VoiceHandler } from './communication/VoiceHandler';
import { config } from './utils/config';
import logger from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    logger.info('Starting Autonomous AI Agent System');
    logger.info('Configuration loaded', {
      port: config.server.port,
      nodeEnv: config.server.nodeEnv,
      maxIterations: config.agent.maxIterations,
    });

    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const orchestrator = new Orchestrator();
    logger.info('Orchestrator initialized');

    const voiceHandler = new VoiceHandler();
    if (voiceHandler.isEnabled()) {
      logger.info('Voice communication enabled');
    }

    const server = new CommunicationServer(config.server.port, orchestrator);
    await server.start();

    logger.info('='.repeat(60));
    logger.info('🤖 Autonomous AI Agent is now running!');
    logger.info('='.repeat(60));
    logger.info(`📡 HTTP API: http://localhost:${config.server.port}`);
    logger.info(`🔌 WebSocket: ws://localhost:${config.server.port}`);
    logger.info('='.repeat(60));
    logger.info('Available endpoints:');
    logger.info('  GET  /health      - Health check');
    logger.info('  GET  /status      - Agent status');
    logger.info('  POST /directive   - Send directive to agent');
    logger.info('  GET  /messages    - Get message history');
    logger.info('  GET  /memory      - Get agent memory');
    logger.info('  GET  /tools       - List available tools');
    logger.info('  POST /stop        - Stop agent execution');
    logger.info('='.repeat(60));

    const availableProviders = orchestrator.getState();
    logger.info('AI Providers configured and ready');

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      orchestrator.stop();
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      orchestrator.stop();
      await server.stop();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

  } catch (error: any) {
    logger.error('Failed to start application', { 
      error: error.message, 
      stack: error.stack 
    });
    process.exit(1);
  }
}

main();
