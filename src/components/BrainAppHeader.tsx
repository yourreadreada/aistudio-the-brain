import React, { useState } from 'react';
import { AISource, Fact, SOURCE_PALETTE } from '../types/brain';
import { BrainLogo } from './BrainLogo';
import { GlobalSearchBar } from './GlobalSearchBar';

interface BrainAppHeaderProps {
  currentBrain: string;
  brains: string[];
  onSelectBrain: (brain: string) => void;
  onCreateBrain: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectFactFromSearch: (fact: Fact, targetBrain?: string) => void;
  activeSourceFilter: AISource | null;
  onSelectSourceFilter: (src: AISource | null) => void;
  onOpenAddFact: () => void;
  onOpenIngest: () => void;
  onOpenMcp: () => void;
  onSwitchToLogin: () => void;
  onToggleRecentActivity: () => void;
  recentActivityCount?: number;
  isRecentActivityOpen?: boolean;
}

export const BrainAppHeader: React.FC<BrainAppHeaderProps> = ({
  currentBrain,
  brains,
  onSelectBrain,
  onCreateBrain,
  searchQuery,
  onSearchChange,
  onSelectFactFromSearch,
  activeSourceFilter,
  onSelectSourceFilter,
  onOpenAddFact,
  onOpenIngest,
  onOpenMcp,
  onSwitchToLogin,
  onToggleRecentActivity,
  recentActivityCount = 0,
  isRecentActivityOpen = false,
}) => {
  const [isCreatingBrain, setIsCreatingBrain] = useState(false);
  const [newBrainName, setNewBrainName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrainName.trim()) return;
    onCreateBrain(newBrainName.trim());
    setNewBrainName('');
    setIsCreatingBrain(false);
  };

  return (
    <header className="relative z-20 flex flex-col border-b border-white/10 bg-[#03040a]/80 backdrop-blur-xl">
      {/* Top Row: Logo, Brain Switcher, Search, Actions */}
      <div className="flex h-14 w-full items-center justify-between pl-28 pr-4 sm:pl-32 md:pl-28 md:pr-6 gap-3">
        {/* Brand & Brain Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 text-white">
            <BrainLogo size={18} className="text-white" />
            <span className="mono text-[13px] tracking-wider text-ink font-semibold">THE BRAIN</span>
          </div>

          <span className="mono text-[11px] text-ink-ghost">/</span>

          {isCreatingBrain ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder="brain name..."
                value={newBrainName}
                onChange={(e) => setNewBrainName(e.target.value)}
                className="mono rounded-xl border border-white/36 bg-black/40 px-3 py-1 text-[13px] text-ink outline-none backdrop-blur-md placeholder:text-ink-ghost focus:border-white/52"
              />
              <button
                type="submit"
                className="mono rounded-xl bg-white/90 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-white"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingBrain(false)}
                className="mono text-xs text-ink-ghost hover:text-ink"
              >
                ✕
              </button>
            </form>
          ) : (
            <select
              value={currentBrain}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsCreatingBrain(true);
                } else {
                  onSelectBrain(e.target.value);
                }
              }}
              className="mono cursor-pointer rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink outline-none backdrop-blur-md transition hover:border-white/52 focus:border-white/52"
            >
              {brains.map((b) => (
                <option key={b} value={b} className="bg-[#03040a] text-white">
                  brain: {b}
                </option>
              ))}
              <option value="__NEW__" className="bg-[#03040a] text-ink-faint">
                + New Brain...
              </option>
            </select>
          )}
        </div>

        {/* Global Search Bar (Center) */}
        <div className="flex flex-1 items-center justify-center px-2 max-w-md">
          <GlobalSearchBar
            currentBrain={currentBrain}
            filterQuery={searchQuery}
            onFilterChange={onSearchChange}
            onSelectFact={onSelectFactFromSearch}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Recent Activity Toggle Button */}
          <button
            onClick={onToggleRecentActivity}
            className={`mono flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] transition ${
              isRecentActivityOpen
                ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-200'
                : 'border-white/30 bg-black/30 text-ink-soft hover:border-white/52 hover:bg-black/45 hover:text-white'
            }`}
            title="View Recent Activity (accessed, modified, stored nodes)"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
            </span>
            <span className="hidden sm:inline">Recent Activity</span>
            {recentActivityCount > 0 && (
              <span className="mono rounded-full bg-white/15 px-1.5 py-0.2 text-[9.5px] text-white/80">
                {recentActivityCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAddFact}
            className="mono rounded-xl bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-white"
          >
            + Store Fact
          </button>

          <button
            onClick={onOpenIngest}
            className="mono hidden rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45 lg:block"
            title="Bulk ingest chat exports"
          >
            Ingest
          </button>

          <button
            onClick={onOpenMcp}
            className="mono hidden rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45 md:block"
            title="MCP Bridge config"
          >
            MCP Bridge
          </button>

          {/* Integrated View Switcher Segmented Control */}
          <div className="flex items-center rounded-xl border border-white/15 bg-black/50 p-1 backdrop-blur-md shrink-0">
            <button
              onClick={onSwitchToLogin}
              className="mono rounded-lg px-2.5 py-1 text-[11px] text-white/50 transition hover:text-white"
              title="Return to Welcome Portal"
            >
              Welcome
            </button>
            <div className="mono rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
              The Brain
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Bar: Sources filter row */}
      <div className="flex h-9 w-full items-center justify-between border-t border-white/5 pl-28 pr-4 sm:pl-32 md:pl-28 md:pr-6 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          <span className="mono text-[10px] uppercase text-ink-ghost mr-1 shrink-0">
            Receipts:
          </span>
          <button
            onClick={() => onSelectSourceFilter(null)}
            className={`mono shrink-0 rounded-lg px-2.5 py-0.5 text-[11px] transition ${
              activeSourceFilter === null
                ? 'bg-white/20 text-ink font-medium shadow-sm'
                : 'text-ink-ghost hover:text-ink'
            }`}
          >
            All Sources
          </button>

          {(Object.keys(SOURCE_PALETTE) as AISource[]).map((src) => {
            const isSelected = activeSourceFilter === src;
            return (
              <button
                key={src}
                onClick={() => onSelectSourceFilter(isSelected ? null : src)}
                className={`mono flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] transition ${
                  isSelected
                    ? 'border border-white/52 bg-white/15 text-ink font-medium'
                    : 'text-ink-ghost hover:text-ink'
                }`}
              >
                <span>{SOURCE_PALETTE[src].name}</span>
              </button>
            );
          })}
        </div>

        <div className="mono hidden text-[10px] text-ink-ghost lg:block">
          Local SQLite FTS5 · Click any constellation node to correct() or forget()
        </div>
      </div>
    </header>
  );
};
