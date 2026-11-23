import type { ArgumentValue } from '@/types/tengu';
import { useState } from 'react';
import { Code2, Globe, FileCode, FolderOpen, AlertTriangle, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Script, RunResult } from '@/types/tengu';
import { RunTab } from './RunTab';
import { HistoryTab } from './HistoryTab';

interface ScriptDetailsProps {
  script: Script;
  history: RunResult[];
  onRun: (args: Record<string, ArgumentValue>, envOverrides?: Record<string, string>) => Promise<RunResult>;
  running: boolean;
}

export function ScriptDetails({ script, history, onRun, running }: ScriptDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [latestRun, setLatestRun] = useState<RunResult | null>(null);
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<RunResult | null>(null);

  const handleRun = async (args: Record<string, ArgumentValue>, envOverrides?: Record<string, string>) => {
    const result = await onRun(args, envOverrides);
    setLatestRun(result);
    return result;
  };

  const handleSelectHistoryRun = (run: RunResult) => {
    setSelectedHistoryRun(run);
    setActiveTab('run');
  };

  const displayedRun = selectedHistoryRun || latestRun;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Script Header */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-foreground">{script.name}</h2>
              <Badge variant={script.type === 'python' ? 'default' : 'secondary'} className="gap-1">
                {script.type === 'python' ? <Code2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {script.type === 'python' ? 'Python Script' : 'HTTP Action'}
              </Badge>
              {script.dangerous && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Dangerous
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" />
                {script.category}
              </span>
              {script.tags && script.tags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {script.tags.slice(0, 3).map(tag => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 bg-secondary rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono">
              <FileCode className="w-4 h-4" />
              {script.type === 'python' ? script.filePath : script.httpUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6">
          <TabsList className="h-12 bg-transparent gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="run"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground"
            >
              Run
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-secondary data-[state=active]:text-foreground"
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <TabsContent value="overview" className="m-0 p-6 animate-fade-in">
            <OverviewTab script={script} />
          </TabsContent>

          <TabsContent value="run" className="m-0 p-6 animate-fade-in">
            <RunTab 
              script={script} 
              onRun={handleRun} 
              running={running}
              runResult={displayedRun}
              onClearResult={() => setSelectedHistoryRun(null)}
            />
          </TabsContent>

          <TabsContent value="history" className="m-0 p-6 animate-fade-in">
            <HistoryTab 
              history={history} 
              onSelectRun={handleSelectHistoryRun}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab({ script }: { script: Script }) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Description */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Description</h3>
        <p className="text-foreground leading-relaxed">{script.description}</p>
      </section>

      {/* Dangerous Warning */}
      {script.dangerous && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">This script is marked as dangerous</p>
            <p className="text-sm text-muted-foreground mt-1">
              Review what it does before running it. This action may have irreversible consequences.
            </p>
          </div>
        </div>
      )}

      {/* Python-specific info */}
      {script.type === 'python' && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Script Details</h3>
          <div className="grid gap-3">
            <InfoRow label="Script Path" value={script.filePath} mono />
            <InfoRow label="Working Directory" value={script.workingDirectory} mono />
            <InfoRow label="Interpreter" value={script.interpreterVersion} />
          </div>
        </section>
      )}

      {/* HTTP-specific info */}
      {script.type === 'http' && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">HTTP Details</h3>
          <div className="grid gap-3">
            <InfoRow 
              label="Method" 
              value={
                <Badge variant="outline" className="font-mono">
                  {script.httpMethod}
                </Badge>
              } 
            />
            <InfoRow label="URL" value={script.httpUrl} mono />
            {script.httpHeaders && Object.keys(script.httpHeaders).length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Headers</span>
                <div className="bg-secondary/50 rounded-lg p-3 font-mono text-sm space-y-1">
                  {Object.entries(script.httpHeaders).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-primary">{key}:</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {script.httpBody && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Request Body</span>
                <pre className="bg-secondary/50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                  {script.httpBody}
                </pre>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" />
            Templated fields use <code className="px-1 py-0.5 bg-secondary rounded text-xs">{'{{VARIABLE_NAME}}'}</code> syntax
          </p>
        </section>
      )}

      {/* Arguments Preview */}
      {script.arguments.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Arguments ({script.arguments.length})
          </h3>
          <div className="grid gap-2">
            {script.arguments.map(arg => (
              <div 
                key={arg.name}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono text-primary">{arg.name}</code>
                  <span className="text-sm text-muted-foreground">{arg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {arg.type}
                  </Badge>
                  {arg.required && (
                    <Badge variant="secondary" className="text-xs">required</Badge>
                  )}
                  {arg.secret && (
                    <Badge variant="secondary" className="text-xs">secret</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  mono = false 
}: { 
  label: string; 
  value: React.ReactNode; 
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      {typeof value === 'string' ? (
        <span className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
      ) : (
        value
      )}
    </div>
  );
}
