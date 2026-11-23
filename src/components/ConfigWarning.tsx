import { AlertTriangle } from 'lucide-react';

interface ConfigWarningProps {
  show: boolean;
}

export function ConfigWarning({ show }: ConfigWarningProps) {
  if (!show) return null;

  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-warning">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Enter API URL and API key to start using Tengu Forge.</span>
      </div>
    </div>
  );
}
