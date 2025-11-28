import { Daytona } from "@daytonaio/sdk";
import type { SandboxConfig } from "./types";

type SandboxInstance = Awaited<ReturnType<Daytona["create"]>>;

export interface ExecuteCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class Sandbox {
  private sandbox: SandboxInstance;

  private constructor(sandbox: SandboxInstance) {
    this.sandbox = sandbox;
  }

  static async create(
    language: string,
    config: SandboxConfig
  ): Promise<Sandbox> {
    const daytona = new Daytona({ apiKey: config.apiKey });
    const sandboxInstance = await daytona.create({ language });
    return new Sandbox(sandboxInstance);
  }

  async run(
    code: string
  ): Promise<Awaited<ReturnType<SandboxInstance["process"]["codeRun"]>>> {
    const result = await this.sandbox.process.codeRun(code);
    return result;
  }

  async kill() {
    await this.sandbox.stop();
    await this.sandbox.delete();
  }

  async readFile(filename: string) {
    const file = await this.sandbox.fs.downloadFile(filename);
    return file.toString();
  }

  async uploadFile(content: Buffer, remotePath: string): Promise<void> {
    await this.sandbox.fs.uploadFile(content, remotePath);
  }

  async executeCommand(
    command: string,
    cwd?: string,
    timeout?: number
  ): Promise<ExecuteCommandResult> {
    const result = await this.sandbox.process.executeCommand(command, {
      cwd,
      timeout,
    });
    return {
      exitCode: result.exitCode,
      stdout: result.result ?? "",
      stderr: result.stderr ?? "",
    };
  }
}
