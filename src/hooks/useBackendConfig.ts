import { useState, useEffect, useCallback } from "react";
import type { BackendConfig, ConnectionStatus } from "@/types/tengu";

const STORAGE_KEY = "tengu-backend-config";

const DEFAULT_CONFIG: BackendConfig = {
  apiUrl: "http://127.0.0.1:8000",
  apiKey: "",
};

function loadInitialConfig(): BackendConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      apiUrl: typeof parsed.apiUrl === "string" ? parsed.apiUrl : "",
      apiKey: "",
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function persistConfig(config: BackendConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiUrl: config.apiUrl }));
  } catch {
    // ignore storage errors
  }
}

export function useBackendConfig() {
  const [config, setConfigState] = useState<BackendConfig>(() =>
    loadInitialConfig(),
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });

  const isConfigured =
    Boolean(config.apiUrl && config.apiKey) &&
    config.apiUrl.trim().length > 0 &&
    config.apiKey.trim().length > 0;

  const setConfig = useCallback((next: BackendConfig) => {
    setConfigState(next);
    persistConfig(next);
    setConnectionStatus({ connected: false });
  }, []);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  // Keep localStorage in sync if config is changed elsewhere
  useEffect(() => {
    persistConfig(config);
  }, [config]);

  return {
    config,
    setConfig,
    isConfigured,
    connectionStatus,
    updateConnectionStatus,
  };
}
