import { useState } from 'react';
import { Moon, Sun, Settings2 } from 'lucide-react';
import tenguLogo from '@/assets/tengu-logo.png';
import saveIcon from '@/assets/save-icon.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { BackendConfig, ConnectionStatus } from '@/types/tengu';

interface TopBarProps {
  config: BackendConfig;
  onConfigSave: (config: BackendConfig) => void;
  connectionStatus: ConnectionStatus;
  onCheckConnection: () => void;
}

export function TopBar({ config, onConfigSave, connectionStatus, onCheckConnection }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [localConfig, setLocalConfig] = useState(config);
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = () => {
    // Just save config. User can hit "Connect" explicitly.
    onConfigSave(localConfig);
  };

  const hasChanges =
    localConfig.apiUrl !== config.apiUrl || localConfig.apiKey !== config.apiKey;

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left: Logo & App Name */}
        <div className="flex items-center gap-3">
          <img src={tenguLogo} alt="Tengu Forge" className="w-14 h-14 rounded-lg object-cover" />
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Tengu Forge
          </h1>
        </div>

        {/* Center: Backend Settings */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 md:hidden"
            >
              <Settings2 className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <div className={`flex-1 items-center gap-2 ${showSettings ? 'flex' : 'hidden md:flex'}`}>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="API URL"
                  value={localConfig.apiUrl}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({ ...prev, apiUrl: e.target.value }))
                  }
                  className="h-9 text-sm bg-background/50 max-w-[200px]"
                />
                <Input
                  type="password"
                  placeholder="API Key"
                  value={localConfig.apiKey}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  className="h-9 text-sm bg-background/50 w-32"
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="h-9"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onCheckConnection}
                  className="h-9"
                >
                  Connect
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: theme toggle or whatever else you add later */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
