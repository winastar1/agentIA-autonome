import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../utils/config';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export class SecureShellExecutor {
  private allowedCommands: Set<string>;
  private maxExecutionTime: number;

  constructor() {
    this.allowedCommands = new Set(config.security.allowedShellCommands);
    this.maxExecutionTime = config.security.maxShellExecutionTime;
  }

  private isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
    if (!config.security.enableShellSandbox) {
      return { allowed: true };
    }

    const trimmedCommand = command.trim();
    
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,  // rm -rf /
      />\s*\/dev\/sd/,   // Writing to disk devices
      /mkfs/,            // Formatting filesystems
      /dd\s+if=/,        // Disk operations
      /curl.*\|\s*bash/, // Piping to bash
      /wget.*\|\s*sh/,   // Piping to shell
      /eval/,            // Eval commands
      /exec/,            // Exec commands
      /fork/,            // Fork bombs
      /:\(\)\{.*:\|:&\}/, // Fork bomb pattern
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedCommand)) {
        return {
          allowed: false,
          reason: `Command contains dangerous pattern: ${pattern.source}`,
        };
      }
    }

    const baseCommand = trimmedCommand.split(/[\s|&;]/)[0];
    
    if (!this.allowedCommands.has(baseCommand)) {
      return {
        allowed: false,
        reason: `Command '${baseCommand}' is not in the allowed list. Allowed commands: ${Array.from(this.allowedCommands).join(', ')}`,
      };
    }

    return { allowed: true };
  }

  async execute(command: string): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    command: string;
  }> {
    logger.info('Attempting to execute shell command', { command });

    const { allowed, reason } = this.isCommandAllowed(command);
    if (!allowed) {
      logger.warn('Shell command blocked by security policy', { command, reason });
      return {
        success: false,
        error: `Security policy violation: ${reason}`,
        command,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.maxExecutionTime,
        maxBuffer: 1024 * 1024, // 1MB max output
        env: {
          ...process.env,
          PATH: process.env.PATH,
        },
      });

      logger.info('Shell command executed successfully', { command });
      return {
        success: true,
        stdout,
        stderr,
        command,
      };
    } catch (error: any) {
      logger.error('Shell command failed', { command, error: error.message });
      
      if (error.killed) {
        return {
          success: false,
          error: `Command timed out after ${this.maxExecutionTime}ms`,
          stdout: error.stdout,
          stderr: error.stderr,
          command,
        };
      }

      return {
        success: false,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
        command,
      };
    }
  }

  addAllowedCommand(command: string): void {
    this.allowedCommands.add(command);
    logger.info('Added allowed command', { command });
  }

  removeAllowedCommand(command: string): void {
    this.allowedCommands.delete(command);
    logger.info('Removed allowed command', { command });
  }

  getAllowedCommands(): string[] {
    return Array.from(this.allowedCommands);
  }
}
