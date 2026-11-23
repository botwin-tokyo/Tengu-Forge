import { FileCode, Play } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FileCode className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select a Script
        </h2>
        <p className="text-muted-foreground mb-6">
          Choose a script from the sidebar to view its details, configure arguments, and run it.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Play className="w-4 h-4" />
          <span>Browse Python scripts and HTTP actions</span>
        </div>
      </div>
    </div>
  );
}
