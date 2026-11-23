import type { ArgumentValue } from '@/types/tengu';
import { Clock, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RunResult, RunStatus } from '@/types/tengu';
import { cn } from '@/lib/utils';

interface HistoryTabProps {
  history: RunResult[];
  onSelectRun: (run: RunResult) => void;
}

export function HistoryTab({ history, onSelectRun }: HistoryTabProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const truncateArgs = (args: Record<string, ArgumentValue>, maxLength: number = 50) => {
    const str = Object.entries(args)
      .filter(([_, v]) => typeof v !== 'object')
      .map(([k, v]) => `${k}=${typeof v === 'string' && v.length > 10 ? v.slice(0, 10) + '...' : v}`)
      .join(', ');
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No run history</h3>
        <p className="text-sm text-muted-foreground">
          Run this script to see its execution history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Run History ({history.length})
      </h3>
      
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Duration</TableHead>
              <TableHead>Arguments</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((run) => (
              <TableRow 
                key={run.id}
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => onSelectRun(run)}
              >
                <TableCell className="font-mono text-sm">
                  {formatTime(run.startTime)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDuration(run.duration)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate">
                  {truncateArgs(run.arguments)}
                </TableCell>
                <TableCell>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
      {status === 'success' && '✓'}
      {status === 'error' && '✕'}
      <span className="capitalize">{status}</span>
    </span>
  );
}
