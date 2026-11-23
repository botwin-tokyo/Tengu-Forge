import { sendHTTPAction } from '@/lib/sendHTTPAction';
import { useMemo } from 'react';
import type { ArgumentValue } from '@/types/tengu';
import type {
  BackendConfig,
  Script,
  RunResult,
  HTTPAction,
  ConnectionStatus,
} from '@/types/tengu';

/**
 * Core API wrapper for Tengu Forge.
 * This is the ONLY place that should know about the backend URLs.
 */
export function useApi(config: BackendConfig) {
  return useMemo(() => createApi(config), [config]);
}

function createApi(config: BackendConfig) {
  const baseUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');

  const buildHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const key = config.apiKey?.trim();
    if (key) {
      headers['X-API-Key'] = key;
    }

    return headers;
  };

  const ensureBaseUrl = () => {
    if (!baseUrl) {
      throw new Error('API URL is not configured');
    }
  };

  const checkConnection = async (): Promise<ConnectionStatus> => {
    if (!baseUrl) {
      return {
        connected: false,
        error: 'API URL is not configured',
      };
    }

    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: buildHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          connected: false,
          error:
            text ||
            `Health check failed with status ${res.status.toString()}`,
        };
      }

      return { connected: true };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : 'Unable to reach backend',
      };
    }
  };

  const fetchScripts = async (): Promise<Script[]> => {
    ensureBaseUrl();

    const res = await fetch(`${baseUrl}/scripts`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch scripts (status ${res.status})`);
    }

    const data = (await res.json()) as Script[];
    return data;
  };

  const fetchRunHistory = async (scriptId: string): Promise<RunResult[]> => {
    ensureBaseUrl();

    const res = await fetch(
      `${baseUrl}/scripts/${encodeURIComponent(scriptId)}/runs`,
      {
        method: 'GET',
        headers: buildHeaders(),
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch run history (status ${res.status})`);
    }

    const data = (await res.json()) as RunResult[];
    return data;
  };

  const runScript = async (
    scriptId: string,
    args: Record<string, ArgumentValue>,
    envOverrides?: Record<string, string>,
  ): Promise<RunResult> => {
    ensureBaseUrl();

    const res = await fetch(
      `${baseUrl}/scripts/${encodeURIComponent(scriptId)}/run`,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          arguments: args ?? {},
          env: envOverrides ?? {},
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        text || `Failed to run script (status ${res.status.toString()})`,
      );
    }

    const data = (await res.json()) as RunResult;
    return data;
  };

  const fetchHTTPActions = async (): Promise<HTTPAction[]> => {
    ensureBaseUrl();

    const res = await fetch(`${baseUrl}/http-actions`, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch HTTP actions (status ${res.status})`,
      );
    }

    const data = (await res.json()) as HTTPAction[];
    return data;
  };

  const createHTTPAction = async (
    action: Omit<HTTPAction, 'id' | 'createdAt'>,
    id?: string,
  ): Promise<HTTPAction> => {
    ensureBaseUrl();

    const res = await fetch(`${baseUrl}/http-actions${id ? '/' + encodeURIComponent(id) : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(action),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        text || `Failed to create HTTP action (status ${res.status})`,
      );
    }

    const data = (await res.json()) as HTTPAction;
    return data;
  };

  return {
    checkConnection,
    fetchScripts,
    fetchRunHistory,
    runScript,
    fetchHTTPActions,
    createHTTPAction,
    sendHTTPAction: (id: string) => {
      ensureBaseUrl();
      return sendHTTPAction(baseUrl, buildHeaders(), id);
    },
    deleteHTTPAction: async (id: string) => {
      ensureBaseUrl();
      const res = await fetch(`${baseUrl}/http-actions/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: buildHeaders(),
      });
      if (!res.ok) throw new Error(`Delete failed (status ${res.status})`);
    },
  };
}
