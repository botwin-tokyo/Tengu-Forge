import type { ArgumentValue } from '@/types/tengu';
import { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar } from '@/components/TopBar';
import { ConfigWarning } from '@/components/ConfigWarning';
import { Sidebar } from '@/components/Sidebar';
import { ScriptDetails } from '@/components/ScriptDetails';
import { ScriptDetailsSkeleton } from '@/components/ScriptDetailsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { HTTPActionsManager } from '@/components/HTTPActionsManager';
import { useBackendConfig } from '@/hooks/useBackendConfig';
import { useApi } from '@/hooks/useApi';
import { Script, RunResult, HTTPAction, BackendConfig } from '@/types/tengu';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const { toast } = useToast();
  const {
    config,
    setConfig,
    isConfigured,
    connectionStatus,
    updateConnectionStatus,
  } = useBackendConfig();
  const api = useApi(config);

  const [scripts, setScripts] = useState<Script[]>([]);
  const [httpActions, setHTTPActions] = useState<HTTPAction[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scriptHistory, setScriptHistory] = useState<RunResult[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [running, setRunning] = useState(false);

  const activeScript = useRef<Script | null>(null);
  const connectionAttempt = useRef(0);
  const handleConfigSave = (newConfig: BackendConfig) => {
    setConfig(newConfig);
    connectionAttempt.current++;
    activeScript.current = null;
    setScripts([]);
    setHTTPActions([]);
    setSelectedScript(null);
    setScriptHistory([]);
  };

  const checkConnection = useCallback(async () => {
    if (!isConfigured) {
      updateConnectionStatus({ connected: false });
      return;
    }

    const attempt = ++connectionAttempt.current;
    const status = await api.checkConnection();
    if (attempt !== connectionAttempt.current) return;
    updateConnectionStatus(status);

    if (!status.connected && status.error) {
      toast({
        title: 'Connection Failed',
        description: status.error,
        variant: 'destructive',
      });
    }
  }, [api, isConfigured, updateConnectionStatus, toast]);

  const isConnected = !!connectionStatus.connected;

  // Load scripts ONLY once after we are actually connected
  useEffect(() => {
    if (!isConfigured || !isConnected) {
      return;
    }

    let cancelled = false;
    const loadData = async () => {
      setLoadingScripts(true);
      try {
        const [scriptsData, actionsData] = await Promise.all([
          api.fetchScripts(),
          api.fetchHTTPActions(),
        ]);
        if (cancelled) return;
        setScripts(scriptsData);
        setHTTPActions(actionsData);
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Failed to load scripts',
          description:
            error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoadingScripts(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [isConfigured, connectionStatus, isConnected, api, toast]);

  // Load script history when selection changes, only when connected
  useEffect(() => {
    if (!selectedScript || !isConfigured || !isConnected) {
      setScriptHistory([]);
      setLoadingDetails(false);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setLoadingDetails(true);
      try {
        const history = await api.fetchRunHistory(selectedScript.id);
        if (!cancelled) {
          setScriptHistory(history);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedScript, isConfigured, isConnected, api]);

  const handleSelectScript = (script: Script) => {
    activeScript.current = script;
    setSelectedScript(script);
  };

  const handleRunScript = async (
    args: Record<string, ArgumentValue>,
    envOverrides?: Record<string, string>,
  ): Promise<RunResult> => {
    if (!selectedScript) throw new Error('No script selected');

    setRunning(true);
    try {
      const result = await api.runScript(
        selectedScript.id,
        args,
        envOverrides,
      );

      // Add to history locally so user sees the new run immediately
      if (activeScript.current === selectedScript) setScriptHistory((prev) => [result, ...prev]);

      if (result.status === 'success') {
        toast({
          title: 'Script completed',
          description: `${selectedScript.name} finished successfully.`,
        });
      } else {
        toast({
          title: 'Script failed',
          description: `${selectedScript.name} exited with errors.`,
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      toast({
        title: 'Execution failed',
        description:
          error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setRunning(false);
    }
  };

  const handleCreateHTTPAction = async (
    action: Omit<HTTPAction, 'id' | 'createdAt'>,
    id?: string,
  ) => {
    try {
      const newAction = await api.createHTTPAction(action, id);
      setHTTPActions(prev => id ? prev.map(item => item.id === id ? newAction : item) : [...prev, newAction]);
      toast({
        title: 'HTTP action saved',
        description: `${action.name} has been saved.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to save action',
        description:
          error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar
        config={config}
        onConfigSave={handleConfigSave}
        connectionStatus={connectionStatus}
        onCheckConnection={checkConnection}
      />

      {/* Config Warning */}
      <ConfigWarning show={!isConfigured} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          scripts={scripts}
          selectedScriptId={selectedScript?.id || null}
          onSelectScript={handleSelectScript}
          loading={loadingScripts}
        />

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* HTTP Actions Manager in header area */}
          <div className="flex items-center justify-end px-6 py-3 border-b border-border bg-card/30">
            <HTTPActionsManager
              actions={httpActions}
              onCreateAction={handleCreateHTTPAction}
              onSend={api.sendHTTPAction}
              onDelete={async id => {
                await api.deleteHTTPAction(id);
                setHTTPActions(prev => prev.filter(item => item.id !== id));
              }}
            />
          </div>

          {/* Script Details or Empty State */}
          {loadingDetails ? (
            <ScriptDetailsSkeleton />
          ) : selectedScript ? (
            <ScriptDetails
              key={selectedScript.id}
              script={selectedScript}
              history={scriptHistory}
              onRun={handleRunScript}
              running={running}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
