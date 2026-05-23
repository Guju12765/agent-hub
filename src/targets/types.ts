/**
 * Target adapter interface for multi-platform support
 */

export type TargetName = "claude";

export interface McpServerEntry {
  type?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface DeployResult {
  success: boolean;
  message: string;
  assetsCopied?: number;
  mcpsConfigured?: number;
}

/**
 * Target adapter interface
 */
export interface TargetAdapter {
  readonly name: TargetName;
  readonly displayName: string;

  detect(): boolean;
  getSettingsDir(): string;
  getConfigDirs(settingsDir: string): {
    skills: string;
    rules: string;
  };
  getMcpConfigPath(): string;
  getInstructionsDir(): string;

  injectMcp(name: string, config: McpServerEntry): { added: boolean; skipped: boolean };
  removeMcp(name: string): boolean;
  isSupported(): boolean;
}
