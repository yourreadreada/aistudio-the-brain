import React, { useState } from 'react';
import { AISource, SOURCE_PALETTE } from '../types/brain';
import { ApexLogo } from './ApexLogo';

interface BrainAppHeaderProps {
  currentBrain: string;
  brains: string[];
  onSelectBrain: (brain: string) => void;
  onCreateBrain: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeSourceFilter: AISource | null;
  onSelectSourceFilter: (src: AISource | null) => void;
  onOpenAddFact: () => void;
  onOpenIngest: () => void;
  onOpenMcp: () => void;
  onSwitchToLogin: () => void;
}

export const BrainAppHeader: React.FC<BrainAppHeaderProps> = ({
  currentBrain,
  brains,
  onSelectBrain,
  onCreateBrain,
  searchQuery,
  onSearchChange,
  activeSourceFilter,
  onSelectSourceFilter,
  onOpenAddFact,
  onOpenIngest,
  onOpenMcp,
  onSwitchToLogin,
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
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-6">
        {/* Brand & Brain Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-ink-faint">
            <ApexLogo size={15} />
            <span className="mono text-[13px] tracking-wider text-ink font-medium">APEX</span>
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

        {/* Search Bar matching Login input style */}
        <div className="flex max-w-sm flex-1 items-center justify-center px-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search recall() memory..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-white/36 bg-black/30 py-1.5 pl-8 pr-3 text-[13px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45"
            />
            <svg
              className="pointer-events-none absolute left-2.5 top-2 text-ink-ghost"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="mono absolute right-2.5 top-1.5 text-[11px] text-ink-ghost hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddFact}
            className="mono rounded-xl bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-white"
          >
            + Store Fact
          </button>

          <button
            onClick={onOpenIngest}
            className="mono hidden rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45 md:block"
            title="Bulk ingest chat exports"
          >
            Ingest
          </button>

          <button
            onClick={onOpenMcp}
            className="mono hidden rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45 sm:block"
            title="MCP Bridge config"
          >
            MCP Bridge
          </button>

          <button
            onClick={onSwitchToLogin}
            className="mono rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45"
            title="Switch to Apex Login portal"
          >
            Login View
          </button>
        </div>
      </div>

      {/* Sub-Bar: Sources filter row */}
      <div className="flex h-9 w-full items-center justify-between border-t border-white/5 px-4 text-xs md:px-6">
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
