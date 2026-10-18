import React, { useState } from 'react';
import { AISource, Fact, SOURCE_PALETTE } from '../types/brain';
import { BrainLogo } from './BrainLogo';
import { GlobalSearchBar } from './GlobalSearchBar';
import { GuidedService } from './GuidedConnectionModal';

interface BrainAppHeaderProps {
  currentBrain: string;
  brains: string[];
  onSelectBrain: (brain: string) => void;
  onCreateBrain: (name: string) => void;
  onDeleteBrain?: (brain: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectFactFromSearch: (fact: Fact, targetBrain?: string) => void;
  activeSourceFilter: AISource | null;
  onSelectSourceFilter: (src: AISource | null) => void;
  onOpenAddFact: () => void;
  onOpenIngest: () => void;
  onOpenMcp: () => void;
  onOpenGuidedConfig?: (service?: GuidedService) => void;
  connectionStatus?: { chatgpt: boolean; claude: boolean; gemini: boolean; backend: boolean };
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
  onDeleteBrain,
  searchQuery,
  onSearchChange,
  onSelectFactFromSearch,
  activeSourceFilter,
  onSelectSourceFilter,
  onOpenAddFact,
  onOpenIngest,
  onOpenMcp,
  onOpenGuidedConfig,
  connectionStatus = { chatgpt: false, claude: false, gemini: false, backend: false },
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

  const handleOpenConfigWizard = () => {
    if (onOpenGuidedConfig) {
      onOpenGuidedConfig('chatgpt');
    } else {
      onOpenMcp();
    }
  };

  return (
    <header className="relative z-20 flex flex-col border-b border-white/10 bg-[#03040a]/80 backdrop-blur-xl">
      {/* Top Row: Logo, Brain Switcher, Search, Actions */}
      <div className="flex h-14 w-full items-center justify-between pl-28 pr-4 sm:pl-32 md:pl-28 md:pr-6 gap-3">
        {/* Brand & Brain Selector with Delete Option */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-white">
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
            <div className="flex items-center gap-1.5">
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

              {/* Delete Brain Option */}
              {onDeleteBrain && (
                <button
                  type="button"
                  onClick={() => onDeleteBrain(currentBrain)}
                  className="mono p-1.5 rounded-xl border border-white/15 bg-black/30 text-white/40 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition"
                  title={`Delete brain "${currentBrain}" and its facts`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
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

        {/* Actions & Real-Time Connection Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Real-time External AI Connections Status Strip */}
          <button
            type="button"
            onClick={handleOpenConfigWizard}
            className="mono hidden sm:flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] text-white/70 hover:border-white/40 hover:bg-black/60 transition shrink-0"
            title="External AI Chat Connections (Click to open Guided Setup Wizard)"
          >
            <span className="text-white/40 font-medium">AI Sync:</span>
            <span className={`flex items-center gap-1 ${connectionStatus.chatgpt ? 'text-emerald-300 font-semibold' : 'text-white/40'}`}>
              <span>GPT</span>
              <span className="text-[10px]">{connectionStatus.chatgpt ? '✓' : '○'}</span>
            </span>
            <span className="text-white/20">·</span>
            <span className={`flex items-center gap-1 ${connectionStatus.claude ? 'text-amber-300 font-semibold' : 'text-white/40'}`}>
              <span>Claude</span>
              <span className="text-[10px]">{connectionStatus.claude ? '✓' : '○'}</span>
            </span>
            <span className="text-white/20">·</span>
            <span className={`flex items-center gap-1 ${connectionStatus.gemini ? 'text-sky-300 font-semibold' : 'text-white/40'}`}>
              <span>Gemini</span>
              <span className="text-[10px]">{connectionStatus.gemini ? '✓' : '○'}</span>
            </span>
          </button>

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
            <span className="hidden lg:inline">Recent Activity</span>
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
            onClick={handleOpenConfigWizard}
            className="mono hidden rounded-xl border border-white/36 bg-black/30 px-3 py-1.5 text-[12px] text-ink-soft transition hover:border-white/52 hover:bg-black/45 md:block"
            title="Connect ChatGPT, Claude & Gemini Web (100% Free)"
          >
            Web AI & MCP
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
          Local SQLite FTS5 · Two-Way Free Web AI Grounding
        </div>
      </div>
    </header>
  );
};
