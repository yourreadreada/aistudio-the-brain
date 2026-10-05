import React, { useState } from 'react';
import { RecentActivityItem, SOURCE_PALETTE, ActivityAction } from '../types/brain';
import { BrainLogo } from './BrainLogo';

interface RecentActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activities: RecentActivityItem[];
  onSelectActivity: (item: RecentActivityItem) => void;
  onClearActivities?: () => void;
}

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
  isOpen,
  onClose,
  activities,
  onSelectActivity,
  onClearActivities,
}) => {
  const [filterAction, setFilterAction] = useState<ActivityAction | 'all'>('all');

  if (!isOpen) return null;

  const filtered = activities.filter((act) => {
    if (filterAction === 'all') return true;
    return act.action === filterAction;
  });

  const formatRelativeTime = (isoString: string): string => {
    try {
      const then = new Date(isoString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 45) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case 'modified':
        return {
          label: 'Modified',
          color: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
          dot: 'bg-amber-400',
        };
      case 'created':
        return {
          label: 'Stored',
          color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
          dot: 'bg-emerald-400',
        };
      case 'accessed':
      default:
        return {
          label: 'Viewed',
          color: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
          dot: 'bg-sky-400',
        };
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-white/20 bg-[#050713]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-200 ease-out">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2.5 text-white">
          <BrainLogo size={16} className="text-white" />
          <span className="mono text-[13px] font-semibold tracking-wider text-white">
            THE BRAIN
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 transition hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Title & Filter Tabs */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white tracking-tight">
            Recent Activity
          </h2>
          <span className="mono text-[11px] text-white/40">
            {filtered.length} event{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mono mt-1 text-[11px] text-white/50">
          Quickly navigate to nodes you recently accessed or modified
        </p>

        {/* Action Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterAction('all')}
            className={`mono rounded-lg px-2 py-1 text-[10.5px] transition ${
              filterAction === 'all'
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterAction('modified')}
            className={`mono rounded-lg px-2 py-1 text-[10.5px] transition ${
              filterAction === 'modified'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Modified
          </button>
          <button
            onClick={() => setFilterAction('created')}
            className={`mono rounded-lg px-2 py-1 text-[10.5px] transition ${
              filterAction === 'created'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Stored
          </button>
          <button
            onClick={() => setFilterAction('accessed')}
            className={`mono rounded-lg px-2 py-1 text-[10.5px] transition ${
              filterAction === 'accessed'
                ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Viewed
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto px-6 py-3 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs text-white/50">No recent activity found.</p>
            <p className="mono mt-1 text-[10.5px] text-white/30">
              Accessed or modified nodes will appear here for 1-click navigation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => {
              const palette = SOURCE_PALETTE[item.source] || {
                color: '#fff',
                name: item.source,
              };
              const actionBadge = getActionBadge(item.action);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectActivity(item)}
                  className="group cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.99]"
                >
                  {/* Top Bar: Action badge, Source, Brain, Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {/* Action Tag */}
                      <span
                        className={`mono flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] uppercase font-semibold ${actionBadge.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${actionBadge.dot}`} />
                        {actionBadge.label}
                      </span>

                      {/* Source */}
                      <span
                        className="mono text-[10.5px] font-semibold uppercase"
                        style={{ color: palette.color }}
                      >
                        {palette.name}
                      </span>

                      <span className="mono text-[10.5px] text-white/40">
                        #{item.factId}
                      </span>
                    </div>

                    <span className="mono text-[10px] text-white/40">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  {/* Brain Tag */}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="mono text-[10px] text-white/40">
                      brain: <span className="text-white/70">{item.brain}</span>
                    </span>
                  </div>

                  {/* Snippet Content */}
                  <p className="mt-1.5 text-xs text-white/85 leading-relaxed line-clamp-2 font-sans group-hover:text-white">
                    {item.snippet}
                  </p>

                  <div className="mt-2 flex items-center justify-end">
                    <span className="mono text-[9.5px] text-indigo-300/80 group-hover:text-indigo-200">
                      Jump to node →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between">
        <span className="mono text-[10.5px] text-white/30">
          Preserved in local storage
        </span>
        {onClearActivities && activities.length > 0 && (
          <button
            onClick={onClearActivities}
            className="mono text-[10.5px] text-white/40 hover:text-rose-300 transition"
          >
            Clear History
          </button>
        )}
      </div>
    </div>
  );
};
