import { useState } from 'react';
import { Plus, X, Globe, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HTTPAction } from '@/types/tengu';

interface HTTPActionsManagerProps {
  actions: HTTPAction[];
  onSend: (id: string) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
  onCreateAction: (action: Omit<HTTPAction, 'id' | 'createdAt'>, id?: string) => Promise<void>;
}

export function HTTPActionsManager({ actions, onCreateAction, onDelete, onSend }: HTTPActionsManagerProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    method: 'GET' as HTTPAction['method'],
    url: '',
    headers: [{ key: '', value: '' }],
    queryParams: [{ key: '', value: '' }],
    body: '',
  });

  const [editing, setEditing] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  async function perform(task: () => Promise<void>) {
    setBusy(true);
    setFeedback('');
    try { await task(); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  const resetForm = () => {
    setEditing(undefined);
    setFormData({
      name: '',
      description: '',
      method: 'GET',
      url: '',
      headers: [{ key: '', value: '' }],
      queryParams: [{ key: '', value: '' }],
      body: '',
    });
  };

  const addHeader = () => {
    setFormData(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }],
    }));
  };

  const removeHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const headers = [...prev.headers];
      headers[index][field] = value;
      return { ...prev, headers };
    });
  };

  const addQueryParam = () => {
    setFormData(prev => ({
      ...prev,
      queryParams: [...prev.queryParams, { key: '', value: '' }],
    }));
  };

  const removeQueryParam = (index: number) => {
    setFormData(prev => ({
      ...prev,
      queryParams: prev.queryParams.filter((_, i) => i !== index),
    }));
  };

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const queryParams = [...prev.queryParams];
      queryParams[index][field] = value;
      return { ...prev, queryParams };
    });
  };

  const handleCreate = async () => {
    await onCreateAction({
      name: formData.name,
      description: formData.description,
      method: formData.method,
      url: formData.url,
      headers: formData.headers.filter(h => h.key.trim()),
      queryParams: formData.queryParams.filter(p => p.key.trim()),
      body: formData.body,
    }, editing);
    resetForm();
    setCreateDialogOpen(false);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-success/15 text-success',
    POST: 'bg-primary/15 text-primary',
    PUT: 'bg-warning/15 text-warning',
    DELETE: 'bg-destructive/15 text-destructive',
    PATCH: 'bg-accent text-accent-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Globe className="w-4 h-4" />
          HTTP Actions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>HTTP Actions Manager</DialogTitle>
          <DialogDescription>
            The backend sends saved requests to operator-approved destinations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {feedback && <pre aria-live="polite" className="whitespace-pre-wrap break-all max-h-48 overflow-auto">{feedback}</pre>}
          {/* Actions Table */}
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Name</TableHead>
                  <TableHead className="w-[80px]">Method</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No HTTP actions yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.name}</TableCell>
                      <TableCell>
                        <Badge className={methodColors[action.method]} variant="secondary">
                          {action.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[300px]">
                        {action.url}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(action.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button disabled={busy} variant="ghost" onClick={() => {
                          if (window.confirm(`Send ${action.method} to ${action.url}?`))
                            void perform(async () => setFeedback(await onSend(action.id)));
                        }}>Send</Button>
                        <Button variant="ghost" onClick={() => {
                          setEditing(action.id);
                          setFormData({ name: action.name, description: action.description || '', method: action.method,
                            url: action.url, headers: action.headers, queryParams: action.queryParams, body: action.body || '' });
                          setCreateDialogOpen(true);
                        }}>Edit</Button>
                        <Button disabled={busy} aria-label={`Delete ${action.name}`} variant="ghost" size="icon" onClick={() => {
                          if (window.confirm(`Delete ${action.name}?`)) void perform(() => onDelete(action.id));
                        }} className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Create Button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="gap-1.5">
                <Plus className="w-4 h-4" />
                New HTTP Action
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit" : "Create"} HTTP Action</DialogTitle>
                <DialogDescription>
                  Use literal URLs and values. Saved definitions are stored on disk. Keep credentials out of them.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name & Description */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My API Call"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Method</label>
                    <Select
                      value={formData.method}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, method: v as HTTPAction['method'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this action do?"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://api.example.com/status"
                    className="font-mono text-sm"
                  />
                </div>

                {/* Headers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Headers</label>
                    <Button variant="outline" size="sm" onClick={addHeader} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.headers.map((header, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => updateHeader(i, 'key', e.target.value)}
                          className="w-40 font-mono text-sm"
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => updateHeader(i, 'value', e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeHeader(i)} className="h-9 w-9">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Query Parameters */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Query Parameters</label>
                    <Button variant="outline" size="sm" onClick={addQueryParam} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.queryParams.map((param, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => updateQueryParam(i, 'key', e.target.value)}
                          className="w-40 font-mono text-sm"
                        />
                        <Input
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => updateQueryParam(i, 'value', e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeQueryParam(i)} className="h-9 w-9">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Request Body (JSON)</label>
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder='{"key": "example"}'
                    className="font-mono text-sm min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void perform(handleCreate)} disabled={busy || !formData.name || !formData.url}>
                  Save Action
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
