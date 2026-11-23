import { useState } from 'react';
import { Clock, Copy, Check, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RunResult, RunStatus } from '@/types/tengu';
import { cn } from '@/lib/utils';

interface OutputPanelProps {
  result: RunResult | null;
  running: boolean;
}

export function OutputPanel({ result, running }: OutputPanelProps) {
  const [outputTab, setOutputTab] = useState<'stdout' | 'stderr'>('stdout');
  const [copiedStdout, setCopiedStdout] = useState(false);
  const [copiedStderr, setCopiedStderr] = useState(false);

  const copyToClipboard = async (text: string, type: 'stdout' | 'stderr') => {
    await navigator.clipboard.writeText(text);
    if (type === 'stdout') {
      setCopiedStdout(true);
      setTimeout(() => setCopiedStdout(false), 2000);
    } else {
      setCopiedStderr(true);
      setTimeout(() => setCopiedStderr(false), 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-sm">Run Output</h4>
          {running ? (
            <StatusBadge status="running" />
          ) : result ? (
            <StatusBadge status={result.status} />
          ) : null}
        </div>
        
        {result && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(result.startTime)}
            </span>
            {result.duration !== undefined && (
              <span>Duration: {formatDuration(result.duration)}</span>
            )}
          </div>
        )}
      </div>

      {/* Output Tabs */}
      <Tabs value={outputTab} onValueChange={(v) => setOutputTab(v as 'stdout' | 'stderr')}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <TabsList className="h-8 bg-secondary/50">
            <TabsTrigger value="stdout" className="text-xs h-7 px-3">
              stdout
              {result?.stderr && !result.stdout && (
                <span className="ml-1.5 text-muted-foreground">(empty)</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="stderr" className="text-xs h-7 px-3">
              stderr
              {result?.stderr && (
                <span className="ml-1.5 w-2 h-2 bg-destructive rounded-full inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          {result && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => copyToClipboard(
                outputTab === 'stdout' ? result.stdout : result.stderr, 
                outputTab
              )}
            >
              {(outputTab === 'stdout' ? copiedStdout : copiedStderr) ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>

        <TabsContent value="stdout" className="m-0">
          <div className="code-output min-h-[200px] max-h-[400px]">
            {running ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing script...</span>
              </div>
            ) : result?.stdout ? (
              <pre className="whitespace-pre-wrap text-foreground">{result.stdout}</pre>
            ) : (
              <span className="text-muted-foreground">No output</span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stderr" className="m-0">
          <div className="code-output min-h-[200px] max-h-[400px]">
            {running ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for output...</span>
              </div>
            ) : result?.stderr ? (
              <pre className="whitespace-pre-wrap text-destructive">{result.stderr}</pre>
            ) : (
              <span className="text-muted-foreground">No errors</span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={cn(
      "status-badge",
      status === 'success' && "status-success",
      status === 'error' && "status-error",
      status === 'running' && "status-running"
    )}>
      {status === 'running' && (
        <Loader2 className="w-3 h-3 animate-spin" />
      )}
      {status === 'success' && '✓'}
      {status === 'error' && '✕'}
      <span className="capitalize">{status}</span>
    </span>
  );
}
