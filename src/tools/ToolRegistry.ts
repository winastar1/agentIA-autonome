import { Tool } from '../types';
import logger from '../utils/logger';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SecureShellExecutor } from './SecureShellExecutor';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private shellExecutor: SecureShellExecutor;

  constructor() {
    this.shellExecutor = new SecureShellExecutor();
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query' },
      },
      execute: async (args) => this.webSearch(args.query),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        filePath: { type: 'string', description: 'Path to the file' },
      },
      execute: async (args) => this.readFile(args.filePath),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        filePath: { type: 'string', description: 'Path to the file' },
        content: { type: 'string', description: 'Content to write' },
      },
      execute: async (args) => this.writeFile(args.filePath, args.content),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'execute_shell',
      description: 'Execute a shell command',
      parameters: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      execute: async (args) => this.executeShell(args.command),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'http_request',
      description: 'Make an HTTP request',
      parameters: {
        url: { type: 'string', description: 'URL to request' },
        method: { type: 'string', description: 'HTTP method (GET, POST, etc.)' },
        data: { type: 'object', description: 'Request body data', optional: true },
        headers: { type: 'object', description: 'Request headers', optional: true },
      },
      execute: async (args) => this.httpRequest(args.url, args.method, args.data, args.headers),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'list_directory',
      description: 'List contents of a directory',
      parameters: {
        dirPath: { type: 'string', description: 'Path to the directory' },
      },
      execute: async (args) => this.listDirectory(args.dirPath),
      requiresApproval: false,
    });

    this.registerTool({
      name: 'create_directory',
      description: 'Create a new directory',
      parameters: {
        dirPath: { type: 'string', description: 'Path to the directory' },
      },
      execute: async (args) => this.createDirectory(args.dirPath),
      requiresApproval: false,
    });

    logger.info('Default tools registered', { count: this.tools.size });
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
    logger.debug('Tool registered', { toolName: tool.name });
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters).filter(
            key => !tool.parameters[key].optional
          ),
        },
      },
    }));
  }

  private async webSearch(query: string): Promise<any> {
    try {
      logger.info('Performing web search', { query });
      const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
      return {
        success: true,
        results: response.data,
        summary: `Found search results for: ${query}`,
      };
    } catch (error: any) {
      logger.error('Web search failed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async readFile(filePath: string): Promise<any> {
    try {
      logger.info('Reading file', { filePath });
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        success: true,
        content,
        path: filePath,
      };
    } catch (error: any) {
      logger.error('Failed to read file', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async writeFile(filePath: string, content: string): Promise<any> {
    try {
      logger.info('Writing file', { filePath });
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        success: true,
        path: filePath,
        message: 'File written successfully',
      };
    } catch (error: any) {
      logger.error('Failed to write file', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeShell(command: string): Promise<any> {
    return await this.shellExecutor.execute(command);
  }

  private async httpRequest(
    url: string,
    method: string,
    data?: any,
    headers?: any
  ): Promise<any> {
    try {
      logger.info('Making HTTP request', { url, method });
      const response = await axios({
        url,
        method,
        data,
        headers,
      });
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error: any) {
      logger.error('HTTP request failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  private async listDirectory(dirPath: string): Promise<any> {
    try {
      logger.info('Listing directory', { dirPath });
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));
      return {
        success: true,
        path: dirPath,
        items,
      };
    } catch (error: any) {
      logger.error('Failed to list directory', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async createDirectory(dirPath: string): Promise<any> {
    try {
      logger.info('Creating directory', { dirPath });
      await fs.mkdir(dirPath, { recursive: true });
      return {
        success: true,
        path: dirPath,
        message: 'Directory created successfully',
      };
    } catch (error: any) {
      logger.error('Failed to create directory', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
