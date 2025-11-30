export interface ExecuteCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface CloudflareExecResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  duration: number;
  timestamp: string;
  sessionId?: string;
}

// Cloudflare Sandbox interface - matches the return type of getSandbox()
interface CloudflareSandbox {
  exec(command: string): Promise<CloudflareExecResult>;
  writeFile(path: string, content: string): Promise<unknown>;
}

export class Sandbox {
  private sandbox: CloudflareSandbox;

  constructor(sandbox: {
    exec: (command: string) => Promise<CloudflareExecResult>;
    writeFile: (path: string, content: string) => Promise<unknown>;
  }) {
    // Cast to our interface to handle type compatibility between different @cloudflare/sandbox versions
    this.sandbox = sandbox as unknown as CloudflareSandbox;
  }

  async run(code: string): Promise<{ exitCode: number }> {
    // For JavaScript/TypeScript, use bun -e to execute code
    // Escape the code properly for shell execution
    const escapedCode = code.replace(/'/g, "'\\''");
    const result = await this.sandbox.exec(`bun -e '${escapedCode}'`);
    return {
      exitCode: result.exitCode,
    };
  }

  async kill() {
    // Cloudflare Sandbox manages its own lifecycle, so this is a no-op
    // The sandbox persists across requests based on the sessionId
  }

  async readFile(filename: string): Promise<string> {
    // Use cat command to read file contents
    const result = await this.sandbox.exec(`cat ${filename}`);
    if (!result.success || result.exitCode !== 0) {
      throw new Error(
        `Failed to read file ${filename}: ${result.stderr || result.stdout}`,
      );
    }
    return result.stdout;
  }

  async uploadFile(content: Buffer, remotePath: string): Promise<void> {
    // Convert Buffer to string and write to file
    const contentString = content.toString("utf-8");
    await this.sandbox.writeFile(remotePath, contentString);
  }

  async executeCommand(
    command: string,
    cwd?: string,
    _timeout?: number,
  ): Promise<ExecuteCommandResult> {
    // Build command with cwd if specified
    const fullCommand = cwd ? `cd ${cwd} && ${command}` : command;
    const result = await this.sandbox.exec(fullCommand);
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}
