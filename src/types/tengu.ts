export type ArgumentValue = string | number | boolean;
export type ScriptType = 'python' | 'http';

export interface ScriptArgument {
  name: string;
  label: string;
  type: string; // 'string' | 'bool' | 'enum' | 'int' | etc.
  required?: boolean;
  default?: ArgumentValue;
  secret?: boolean;
  options?: string[];
  description?: string;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  type: ScriptType;

  // Python-specific
  filePath?: string | null;
  workingDirectory?: string | null;
  interpreterVersion?: string | null;
  interpreter?: string | null;

  // HTTP-specific (if you ever treat HTTP as a "script" type)
  httpMethod?: string | null;
  httpUrl?: string | null;
  httpHeaders?: Record<string, string> | null;
  httpBody?: string | null;

  category: string;
  tags: string[];
  allowedEnv?: string[];
  dangerous?: boolean;
  arguments: ScriptArgument[];
}

export type RunStatus = 'success' | 'error' | 'running';

export interface RunResult {
  id: string;
  scriptId: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  startTime: string; // ISO string
  duration: number;  // seconds
  exitCode: number;
  arguments: Record<string, ArgumentValue>;
  envOverrides: Record<string, string>;
}

export interface HeaderKV {
  key: string;
  value: string;
}

export interface HTTPAction {
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: HeaderKV[];
  queryParams: HeaderKV[];
  body?: string;
  createdAt: string; // ISO string
}

export interface BackendConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}
