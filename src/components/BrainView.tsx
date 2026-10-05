import React, { useState, useEffect, useMemo } from 'react';
import { Fact, AISource, SOURCE_PALETTE, RecentActivityItem } from '../types/brain';
import { brainStore } from '../services/brainStorage';
import { BrainAppHeader } from './BrainAppHeader';
import { BrainViewerCanvas } from './BrainViewerCanvas';
import { FactPanel } from './FactPanel';
import { AddFactModal } from './AddFactModal';
import { IngestModal } from './IngestModal';
import { McpBridgeModal } from './McpBridgeModal';
import { RecentActivityPanel } from './RecentActivityPanel';

interface BrainViewProps {
  userEmail: string;
  initialBrainName?: string;
  onSwitchToLogin: () => void;
}

export const BrainView: React.FC<BrainViewProps> = ({ userEmail, initialBrainName, onSwitchToLogin }) => {
  const [currentBrain, setCurrentBrain] = useState(initialBrainName || 'coding');

  useEffect(() => {
    if (initialBrainName) {
      setCurrentBrain(initialBrainName);
    }
  }, [initialBrainName]);
  const [brains, setBrains] = useState<string[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSourceFilter, setActiveSourceFilter] = useState<AISource | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  // Recent Activity State
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(false);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);

  const refreshActivities = () => {
    setActivities(brainStore.getRecentActivities());
  };

  useEffect(() => {
    refreshActivities();
  }, []);

  // Compute dynamic scale and intensity for background atmospheric glow container
  const glowMetrics = useMemo(() => {
    const nodeCount = facts.length;
    const activeSources = Array.from(new Set(facts.map((f) => f.source)));
    const sourceCount = activeSources.length;

    // Effective complexity score
    const complexity = nodeCount + sourceCount * 2 + 1;

    // Dynamic scale factor: expands smoothly from 0.85 (sparse) up to 1.75 (dense)
    const scale = Math.min(1.75, Math.max(0.85, 0.85 + Math.sqrt(Math.max(0, nodeCount)) * 0.11));

    // Dynamic outer dimensions (in px)
    const outerWidth = Math.round(540 * scale);
    const outerHeight = Math.round(480 * scale);

    // Dynamic inner ethereal bloom dimensions
    const innerWidth = Math.round(330 * scale);
    const innerHeight = Math.round(290 * scale);

    // Dynamic alphas based on node count
    const primaryAlpha = Math.min(0.82, Math.max(0.46, 0.50 + Math.min(nodeCount, 60) * 0.0055));
    const secondaryAlpha = Math.min(0.55, Math.max(0.28, 0.32 + Math.min(nodeCount, 60) * 0.004));
    const etherealAlpha = Math.min(0.16, Math.max(0.06, 0.065 + Math.min(nodeCount, 60) * 0.0018));

    return {
      outerWidth,
      outerHeight,
      innerWidth,
      innerHeight,
      primaryAlpha,
      secondaryAlpha,
      etherealAlpha,
      nodeCount,
      complexity,
    };
  }, [facts]);

  // Modals
  const [isAddFactOpen, setIsAddFactOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);

  // Load brains and facts
  const refreshData = () => {
    const brainList = brainStore.getBrains();
    setBrains(brainList);
    if (!brainList.includes(currentBrain) && brainList.length > 0) {
      setCurrentBrain(brainList[0]);
    }
    const currentFacts = brainStore.recall(currentBrain, searchQuery, activeSourceFilter);
    setFacts(currentFacts);
  };

  useEffect(() => {
    refreshData();
  }, [currentBrain, searchQuery, activeSourceFilter]);

  const handleCreateBrain = (name: string) => {
    brainStore.createBrain(name);
    setCurrentBrain(name);
    refreshData();
  };

  const handleAddFact = (brain: string, content: string, source: AISource) => {
    const newFact = brainStore.remember(brain, content, source);
    if (brain !== currentBrain) {
      setCurrentBrain(brain);
    }
    refreshData();
    refreshActivities();
    setSelectedFact(newFact);
  };

  const handleSaveCorrection = (id: number, newContent: string) => {
    brainStore.correct(id, newContent);
    refreshData();
    refreshActivities();
    if (selectedFact && selectedFact.id === id) {
      setSelectedFact({ ...selectedFact, content: newContent, updated_at: new Date().toISOString() });
    }
  };

  const handleUpdateFactTags = (id: number, tags: string[]) => {
    brainStore.updateFactTags(id, tags);
    refreshData();
    refreshActivities();
    if (selectedFact && selectedFact.id === id) {
      setSelectedFact({ ...selectedFact, tags, updated_at: new Date().toISOString() });
    }
  };

  const handleDeleteFact = (id: number) => {
    brainStore.forget(id);
    refreshData();
    refreshActivities();
    if (selectedFact && selectedFact.id === id) {
      setSelectedFact(null);
    }
  };

  const handleIngest = (brain: string, source: AISource, rawText: string, chunkSize: number) => {
    const count = brainStore.ingest(brain, source, rawText, chunkSize);
    if (brain !== currentBrain) {
      setCurrentBrain(brain);
    }
    refreshData();
    refreshActivities();
    return count;
  };

  const handleSelectFactFromSearch = (fact: Fact, targetBrain?: string) => {
    if (targetBrain && targetBrain !== currentBrain) {
      setCurrentBrain(targetBrain);
    }
    setSelectedFact(fact);
    brainStore.recordActivity(fact, 'accessed');
    refreshActivities();
  };

  const handleSelectActivity = (item: RecentActivityItem) => {
    const fact = brainStore.getFactById(item.factId);
    if (fact) {
      if (fact.brain !== currentBrain) {
        setCurrentBrain(fact.brain);
      }
      setSelectedFact(fact);
      brainStore.recordActivity(fact, 'accessed');
      refreshActivities();
      setIsRecentActivityOpen(false);
    }
  };

  const handleClearActivities = () => {
    try {
      localStorage.removeItem('apex_brain_recent_activity_v1');
    } catch {}
    setActivities([]);
  };

  const handleFactSelected = (fact: Fact | null) => {
    setSelectedFact(fact);
    if (fact) {
      brainStore.recordActivity(fact, 'accessed');
      refreshActivities();
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#03040a]">
      {/* Top Application Header */}
      <BrainAppHeader
        currentBrain={currentBrain}
        brains={brains}
        onSelectBrain={setCurrentBrain}
        onCreateBrain={handleCreateBrain}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectFactFromSearch={handleSelectFactFromSearch}
        activeSourceFilter={activeSourceFilter}
        onSelectSourceFilter={setActiveSourceFilter}
        onOpenAddFact={() => setIsAddFactOpen(true)}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenMcp={() => setIsMcpOpen(true)}
        onSwitchToLogin={onSwitchToLogin}
        onToggleRecentActivity={() => setIsRecentActivityOpen(!isRecentActivityOpen)}
        recentActivityCount={activities.length}
        isRecentActivityOpen={isRecentActivityOpen}
      />

      {/* Main View Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Atmospheric Background Layers (mimicking the login page atmospheric lighting) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity ease-out [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)] opacity-20"
        />

        {/* Central Atmospheric Radial Gradient Glow (dynamically computed from node complexity) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{
            width: `${glowMetrics.outerWidth}px`,
            height: `${glowMetrics.outerHeight}px`,
            background: `radial-gradient(closest-side, rgba(24, 29, 46, ${glowMetrics.primaryAlpha}) 0%, rgba(12, 16, 28, ${glowMetrics.secondaryAlpha}) 52%, rgba(3, 4, 10, 0) 100%)`,
            filter: `blur(${Math.round(24 * (glowMetrics.outerWidth / 600))}px)`,
          }}
        />

        {/* Secondary Ethereal Blue Glow (expanding dynamically) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{
            width: `${glowMetrics.innerWidth}px`,
            height: `${glowMetrics.innerHeight}px`,
            background: `radial-gradient(circle, rgba(157, 180, 255, ${glowMetrics.etherealAlpha}) 0%, rgba(157, 180, 255, ${glowMetrics.etherealAlpha * 0.3}) 58%, transparent 100%)`,
          }}
        />

        {viewMode === 'graph' ? (
          <BrainViewerCanvas
            brainName={currentBrain}
            facts={facts}
            selectedFactId={selectedFact?.id || null}
            onSelectFact={handleFactSelected}
            searchQuery={searchQuery}
            activeSourceFilter={activeSourceFilter}
          />
        ) : (
          /* List Mode Alternative */
          <div className="h-full overflow-y-auto p-6 md:p-10">
            <div className="mx-auto max-w-4xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="mono text-xs text-white/50">
                  {facts.length} fact(s) in <span className="text-white">"{currentBrain}"</span>
                </span>
                <button
                  onClick={() => setIsAddFactOpen(true)}
                  className="mono text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add Fact
                </button>
              </div>

              {facts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-white/60">No facts stored in this brain yet.</p>
                  <p className="mono mt-1 text-xs text-white/40">
                    Use "Store Fact" or "Ingest" to add context from your AI chats.
                  </p>
                </div>
              ) : (
                facts.map((fact) => {
                  const s = SOURCE_PALETTE[fact.source];
                  return (
                    <div
                      key={fact.id}
                      onClick={() => handleFactSelected(fact)}
                      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/25 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s?.color || '#fff' }}
                          />
                          <span
                            className="mono text-xs font-semibold uppercase"
                            style={{ color: s?.color || '#fff' }}
                          >
                            {s?.name || fact.source}
                          </span>
                          <span className="mono text-[11px] text-white/40">
                            #{fact.id}
                          </span>
                        </div>
                        <span className="mono text-[10px] text-white/40">
                          {new Date(fact.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-white/90">
                        {fact.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* View Toggle Pill (Bottom Right) */}
        <div className="pointer-events-auto absolute bottom-5 right-5 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-md">
          <button
            onClick={() => setViewMode('graph')}
            className={`mono rounded-lg px-2.5 py-1 text-[11px] transition ${
              viewMode === 'graph'
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`mono rounded-lg px-2.5 py-1 text-[11px] transition ${
              viewMode === 'list'
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/40 hover:text-white'
            }`}
          >
            List
          </button>
        </div>

        {/* Empty state overlay on canvas if zero facts */}
        {facts.length === 0 && viewMode === 'graph' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#070913]/90 p-6 text-center max-w-sm backdrop-blur-xl">
              <h4 className="text-sm font-medium text-white">
                No facts in brain "{currentBrain}"
              </h4>
              <p className="mono mt-2 text-xs text-white/50">
                Run the ingest script, or call remember() from an MCP client or UI.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsAddFactOpen(true)}
                  className="mono rounded-xl bg-white/90 px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-white"
                >
                  + Add First Fact
                </button>
                <button
                  onClick={() => setIsIngestOpen(true)}
                  className="mono rounded-xl border border-white/15 px-3.5 py-2 text-xs text-white/80 hover:text-white"
                >
                  Ingest Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slide-over Inspection & Correction Panel */}
        <FactPanel
          fact={selectedFact}
          onClose={() => setSelectedFact(null)}
          onSaveCorrection={handleSaveCorrection}
          onDeleteFact={handleDeleteFact}
          onUpdateTags={handleUpdateFactTags}
        />

        {/* Slide-over Recent Activity Panel */}
        <RecentActivityPanel
          isOpen={isRecentActivityOpen}
          onClose={() => setIsRecentActivityOpen(false)}
          activities={activities}
          onSelectActivity={handleSelectActivity}
          onClearActivities={handleClearActivities}
        />
      </div>

      {/* Modals */}
      <AddFactModal
        isOpen={isAddFactOpen}
        onClose={() => setIsAddFactOpen(false)}
        currentBrain={currentBrain}
        brains={brains}
        onAddFact={handleAddFact}
      />

      <IngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        currentBrain={currentBrain}
        brains={brains}
        onIngest={handleIngest}
      />

      <McpBridgeModal
        isOpen={isMcpOpen}
        onClose={() => setIsMcpOpen(false)}
        currentBrain={currentBrain}
      />
    </div>
  );
};
