import { useState, useMemo } from 'react';
import { Search, Code2, Globe, Folder, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Script } from '@/types/tengu';
import { cn } from '@/lib/utils';

interface SidebarProps {
  scripts: Script[];
  selectedScriptId: string | null;
  onSelectScript: (script: Script) => void;
  loading?: boolean;
}

type FilterType = 'all' | 'python' | 'http';

export function Sidebar({ scripts, selectedScriptId, onSelectScript, loading }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      const name = script.name?.toLowerCase?.() ?? '';
      const desc = script.description?.toLowerCase?.() ?? '';

      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        desc.includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'python' && script.type === 'python') ||
        (activeFilter === 'http' && script.type === 'http');

      return matchesSearch && matchesFilter;
    });
  }, [scripts, searchQuery, activeFilter]);

  const groupedScripts = useMemo(() => {
    const groups: Record<string, Script[]> = {};
    filteredScripts.forEach((script) => {
      const category = script.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(script);
    });
    return groups;
  }, [filteredScripts]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: null },
    { key: 'python', label: 'Python', icon: <Code2 className="w-3 h-3" /> },
    { key: 'http', label: 'HTTP', icon: <Globe className="w-3 h-3" /> },
  ];

  return (
    <aside className="w-72 border-r border-border bg-sidebar flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex gap-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeFilter === filter.key
                  ? 'bg-primary text-primary-foreground mint-glow'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-secondary/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : Object.keys(groupedScripts).length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No scripts found
          </div>
        ) : (
          <div className="space-y-1">
            {Object.entries(groupedScripts).map(([category, categoryScripts]) => (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      collapsedCategories.has(category) && '-rotate-90',
                    )}
                  />
                  <Folder className="w-4 h-4" />
                  <span>{category}</span>
                  <span className="ml-auto text-xs bg-secondary/80 px-1.5 py-0.5 rounded">
                    {categoryScripts.length}
                  </span>
                </button>

                {!collapsedCategories.has(category) && (
                  <div className="ml-4 space-y-0.5">
                    {categoryScripts.map((script) => (
                      <ScriptItem
                        key={script.id}
                        script={script}
                        isSelected={selectedScriptId === script.id}
                        onClick={() => onSelectScript(script)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

interface ScriptItemProps {
  script: Script;
  isSelected: boolean;
  onClick: () => void;
}

function ScriptItem({ script, isSelected, onClick }: ScriptItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
        isSelected
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{script.name}</span>
          {script.dangerous && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/15 text-destructive rounded">
              DANGER
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded',
          script.type === 'python'
            ? 'bg-primary/15 text-primary'
            : 'bg-accent text-accent-foreground',
        )}
      >
        {script.type === 'python' ? 'PY' : 'HTTP'}
      </span>
    </button>
  );
}
