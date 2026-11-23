import type { ArgumentValue } from '@/types/tengu';
import { useState } from 'react';
import { Play, Loader2, AlertTriangle, ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Script, RunResult } from '@/types/tengu';
import { OutputPanel } from './OutputPanel';

interface RunTabProps {
  script: Script;
  onRun: (args: Record<string, ArgumentValue>, envOverrides?: Record<string, string>) => Promise<RunResult>;
  running: boolean;
  runResult: RunResult | null;
  onClearResult: () => void;
}

export function RunTab({ script, onRun, running, runResult, onClearResult }: RunTabProps) {
  const [formValues, setFormValues] = useState<Record<string, ArgumentValue>>(() => {
    const initial: Record<string, ArgumentValue> = {};
    script.arguments.forEach(arg => {
      initial[arg.name] = arg.default ?? (arg.type === 'bool' ? false : '');
    });
    return initial;
  });

  const [envOverrides, setEnvOverrides] = useState<{ key: string; value: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRun = async () => {
    if (script.dangerous) {
      setShowConfirmDialog(true);
      return;
    }
    await executeRun();
  };

  const executeRun = async () => {
    setShowConfirmDialog(false);
    onClearResult();
    
    const envMap: Record<string, string> = {};
    envOverrides.forEach(({ key, value }) => {
      if (key.trim()) envMap[key] = value;
    });

    await onRun(formValues, Object.keys(envMap).length > 0 ? envMap : undefined);
  };

  const addEnvOverride = () => {
    setEnvOverrides([...envOverrides, { key: '', value: '' }]);
  };

  const removeEnvOverride = (index: number) => {
    setEnvOverrides(envOverrides.filter((_, i) => i !== index));
  };

  const updateEnvOverride = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envOverrides];
    updated[index][field] = value;
    setEnvOverrides(updated);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Arguments Form */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Arguments</h3>
        
        {script.arguments.length === 0 ? (
          <p className="text-sm text-muted-foreground">This script has no arguments.</p>
        ) : (
          <div className="grid gap-4">
            {script.arguments.map(arg => (
              <div key={arg.name} className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  {arg.label}
                  {arg.required && <span className="text-destructive">*</span>}
                  {arg.secret && (
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      secret
                    </span>
                  )}
                </label>
                
                {arg.type === 'bool' ? (
                  <Switch
                    checked={formValues[arg.name] === true || formValues[arg.name] === 'true'}
                    onCheckedChange={(checked) => 
                      setFormValues(prev => ({ ...prev, [arg.name]: checked }))
                    }
                  />
                ) : arg.type === 'enum' && arg.options ? (
                  <Select
                    value={String(formValues[arg.name] ?? '')}
                    onValueChange={(value) => 
                      setFormValues(prev => ({ ...prev, [arg.name]: value }))
                    }
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder={`Select ${arg.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {arg.options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={arg.secret ? 'password' : arg.type === 'int' ? 'number' : 'text'}
                    value={String(formValues[arg.name] ?? '')}
                    onChange={(e) => 
                      setFormValues(prev => ({ 
                        ...prev, 
                        [arg.name]: arg.type === 'int' && e.target.value !== '' ? Number(e.target.value) : e.target.value
                      }))
                    }
                    placeholder={arg.description || `Enter ${arg.label.toLowerCase()}`}
                    className="max-w-md"
                  />
                )}
                
                {arg.description && (
                  <p className="text-xs text-muted-foreground">{arg.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Advanced Section */}
      {!!script.allowedEnv?.length && <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
          Advanced Options
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Environment overrides ({script.allowedEnv?.join(", ")})</span>
              <Button variant="outline" size="sm" onClick={addEnvOverride} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
            
            {envOverrides.length > 0 && (
              <div className="space-y-2">
                {envOverrides.map((override, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="KEY"
                      value={override.key}
                      onChange={(e) => updateEnvOverride(index, 'key', e.target.value)}
                      className="w-40 font-mono text-sm"
                    />
                    <span className="text-muted-foreground">=</span>
                    <Input
                      type="password"
                      placeholder="Value"
                      value={override.value}
                      onChange={(e) => updateEnvOverride(index, 'value', e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvOverride(index)}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>}

      {/* Run Button */}
      <div className="pt-2">
        <Button 
          size="lg" 
          onClick={handleRun} 
          disabled={running}
          className="gap-2 min-w-40 mint-glow"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Script
            </>
          )}
        </Button>
      </div>

      {/* Output Panel */}
      {(runResult || running) && (
        <OutputPanel result={runResult} running={running} />
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Dangerous Script Warning
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong>{script.name}</strong> is marked as dangerous. This action may have 
              irreversible consequences. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeRun}>
              Yes, Run Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
