import React, { useState, useEffect } from 'react';
import { Fact, AISource, SOURCE_PALETTE } from '../types/brain';
import { ApexLogo } from './ApexLogo';
import { computeSynapticLinks } from '../services/brainStorage';

export interface SelectedNodeTarget {
  type: 'fact' | 'hub' | 'center';
  fact?: Fact;
  sourceKey?: AISource;
  label?: string;
  totalFactsCount?: number;
}

interface NodeDetailDrawerProps {
  target: SelectedNodeTarget | null;
  allFacts: Fact[];
  onClose: () => void;
  onSaveCorrection: (id: number, newContent: string) => void;
  onDeleteFact: (id: number) => void;
  onSelectNode: (fact: Fact) => void;
  onFilterBySource?: (source: AISource) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  target,
  allFacts,
  onClose,
  onSaveCorrection,
  onDeleteFact,
  onSelectNode,
  onFilterBySource,
}) => {
  const [content, setContent] = useState('');
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const fact = target?.type === 'fact' ? target.fact : undefined;

  useEffect(() => {
    if (fact) {
      setContent(fact.content);
      setIsSavedToast(false);
      setIsCopied(false);
    }
  }, [fact]);

  // Discover linked/related facts that share keywords and real synaptic links
  const { linkedFacts, directSynapseLabels } = React.useMemo(() => {
    if (!fact) return { linkedFacts: [], directSynapseLabels: {} as Record<number, string> };

    // Get all computed synaptic links for the brain
    const allLinks = computeSynapticLinks(allFacts);
    const relatedLinks = allLinks.filter(
      (l) => l.sourceId === fact.id || l.targetId === fact.id
    );

    const labelsMap: Record<number, string> = {};
    const linkedIds = new Set<number>();

    relatedLinks.forEach((l) => {
      const otherId = l.sourceId === fact.id ? l.targetId : l.sourceId;
      linkedIds.add(otherId);
      labelsMap[otherId] = l.label;
    });

    // Also include fuzzy keyword overlap if not already linked
    const words = fact.content
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['this', 'that', 'with', 'from', 'have', 'project', 'uses', 'used'].includes(w));

    allFacts
      .filter((f) => f.id !== fact.id && !linkedIds.has(f.id))
      .forEach((other) => {
        const otherText = other.content.toLowerCase();
        let matchScore = 0;
        words.forEach((w) => {
          if (otherText.includes(w)) matchScore += 1;
        });
        if (matchScore >= 2) {
          linkedIds.add(other.id);
          labelsMap[other.id] = 'Topical Concept Affinity';
        }
      });

    const matches = Array.from(linkedIds)
      .map((id) => allFacts.find((f) => f.id === id))
      .filter((f): f is Fact => Boolean(f))
      .slice(0, 5);

    return { linkedFacts: matches, directSynapseLabels: labelsMap };
  }, [fact, allFacts]);

  if (!target) return null;

  // Determine source meta
  const sourceKey = fact?.source || (target.type === 'hub' ? target.sourceKey : undefined);
  const sourceMeta = sourceKey ? SOURCE_PALETTE[sourceKey] : undefined;

  const handleSave = () => {
    if (!fact || !content.trim()) return;
    onSaveCorrection(fact.id, content.trim());
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2200);
  };

  const handleDelete = () => {
    if (!fact) return;
    if (window.confirm(`Are you sure you want to delete fact #${fact.id}?`)) {
      onDeleteFact(fact.id);
      onClose();
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/[0.1] bg-[#06070d]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-transform duration-300 ease-out">
      {/* Drawer Header */}
      <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-6">
        <div className="flex items-center gap-2.5">
          <ApexLogo size={14} className="text-white/60" />
          <span className="mono text-[11px] font-medium uppercase tracking-widest text-white/50">
            {target.type === 'fact' && fact
              ? `Synapse Node · #${fact.id}`
              : target.type === 'hub'
              ? `AI Hub · ${sourceMeta?.name}`
              : `Core · Brain Node`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {fact && (
            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="mono rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white"
              title="Toggle MCP JSON schema viewer"
            >
              {showJsonInspector ? 'Show Editor' : 'MCP JSON'}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 scrollbar-thin">
        {/* 1. Associated AI Persona Card */}
        {sourceMeta ? (
          <div
            className="rounded-2xl border p-4 transition relative overflow-hidden"
            style={{
              borderColor: `${sourceMeta.color}35`,
              backgroundColor: `${sourceMeta.color}0a`,
            }}
          >
            {/* Subtle glow accent */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: sourceMeta.color }}
            />

            <div className="relative flex items-start gap-3.5">
              {/* Persona Avatar */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-bold shadow-md"
                style={{
                  backgroundColor: `${sourceMeta.color}20`,
                  color: sourceMeta.color,
                  border: `1px solid ${sourceMeta.color}50`,
                }}
              >
                {sourceMeta.avatarChar}
              </div>

              {/* Persona Titles & Role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight text-white">
                      {sourceMeta.name}
                    </span>
                    <span
                      className="mono rounded px-1.5 py-0.5 text-[9.5px] font-medium"
                      style={{
                        backgroundColor: `${sourceMeta.color}1c`,
                        color: sourceMeta.color,
                      }}
                    >
                      {sourceMeta.provider}
                    </span>
                  </div>

                  {target.type === 'hub' && onFilterBySource && (
                    <button
                      onClick={() => onFilterBySource(sourceMeta.id)}
                      className="mono rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      Filter Cluster
                    </button>
                  )}
                </div>

                <div className="mt-1 text-xs font-medium text-white/90">
                  {sourceMeta.personaTitle}
                </div>
                <div className="mono mt-0.5 text-[10.5px] text-white/45">
                  Model: {sourceMeta.defaultModel}
                </div>
              </div>
            </div>

            {/* Persona Responsibility */}
            <div className="relative mt-3.5 border-t border-white/[0.08] pt-2.5">
              <span className="mono text-[9.5px] uppercase tracking-widest text-white/40">
                AI Persona Mandate:
              </span>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                {sourceMeta.roleSpecialty}
              </p>
            </div>
          </div>
        ) : null}

        {/* 2. Fact Specific Content & Correction */}
        {fact && (
          <>
            {/* Metadata Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-2.5">
                <span className="mono text-[9.5px] uppercase tracking-widest text-white/40">Memory ID</span>
                <div className="mono mt-0.5 text-xs font-semibold text-white">#{fact.id}</div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-2.5">
                <span className="mono text-[9.5px] uppercase tracking-widest text-white/40">Brain Context</span>
                <div className="mono mt-0.5 text-xs font-semibold text-white truncate">{fact.brain}</div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-2.5">
                <span className="mono text-[9.5px] uppercase tracking-widest text-white/40">Token Savings</span>
                <div className="mono mt-0.5 text-xs font-semibold text-emerald-400">
                  ~{Math.round(fact.content.length * 0.35 + 85)} tok
                </div>
              </div>
            </div>

            {/* Content Inspector or Raw JSON Toggle */}
            {showJsonInspector ? (
              <div className="rounded-xl border border-white/[0.08] bg-black/60 p-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="mono text-[10px] uppercase text-white/40">
                    MCP Tool Output (db.recall())
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(fact, null, 2))}
                    className="mono text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="mt-2.5 overflow-x-auto font-mono text-[11px] leading-relaxed text-indigo-200">
                  {JSON.stringify(
                    {
                      tool: 'recall',
                      fact_id: fact.id,
                      brain: fact.brain,
                      source: fact.source,
                      content: fact.content,
                      timestamps: {
                        created_at: fact.created_at,
                        updated_at: fact.updated_at,
                      },
                      connected_synapses: linkedFacts.map((f) => ({
                        id: f.id,
                        relationship: directSynapseLabels[f.id] || 'Related',
                        source: f.source,
                      })),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <label className="mono text-[10px] uppercase tracking-widest text-white/40">
                    Fact Content (Live Correctable)
                  </label>
                  <button
                    onClick={handleCopy}
                    className="mono text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    {isCopied ? 'Copied!' : 'Copy Context'}
                  </button>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.12] bg-black/50 p-3.5 text-xs leading-relaxed text-white placeholder-white/30 outline-none transition focus:border-white/35 focus:bg-black/70 min-h-[170px] font-sans selection:bg-white/20"
                  placeholder="Edit fact text..."
                />
              </div>
            )}

            {/* Provenance Receipt */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5 text-[11px] text-white/50">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="mono text-[10.5px]">Local SQLite Storage</span>
              </div>
              <span className="mono text-[10px] text-white/40">
                Updated {new Date(fact.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>

            {/* 3. Linked Sources & Active Synapses */}
            {linkedFacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="mono text-[10px] font-medium uppercase tracking-widest text-white/40">
                    Active Synaptic Connections ({linkedFacts.length})
                  </span>
                  <span className="mono text-[10px] text-indigo-400/80">
                    Shared Knowledge Web
                  </span>
                </div>

                <div className="space-y-2">
                  {linkedFacts.map((lf) => {
                    const lMeta = SOURCE_PALETTE[lf.source];
                    const relationshipLabel = directSynapseLabels[lf.id] || 'Topical Affinity';
                    return (
                      <button
                        key={lf.id}
                        onClick={() => onSelectNode(lf)}
                        className="group flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition hover:border-white/[0.22] hover:bg-white/[0.05]"
                      >
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full shadow-sm"
                          style={{ backgroundColor: lMeta?.color || '#fff' }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="mono text-[10px] font-semibold uppercase"
                                style={{ color: lMeta?.color || '#fff' }}
                              >
                                {lMeta?.name || lf.source}
                              </span>
                              <span className="mono text-[10px] text-white/30">#{lf.id}</span>
                            </div>
                            <span className="mono rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/60">
                              {relationshipLabel}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-white/80 group-hover:text-white leading-relaxed">
                            {lf.content}
                          </p>
                        </div>
                        <span className="mono text-xs text-white/30 group-hover:text-white/80 transition">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!content.trim() || content.trim() === fact.content}
                className="mono flex w-full items-center justify-center rounded-xl bg-white/95 py-3 text-xs font-semibold text-black transition hover:bg-white disabled:opacity-35"
              >
                {isSavedToast ? 'Correction Saved!' : 'Save Correction (correct())'}
              </button>

              <button
                onClick={handleDelete}
                className="mono flex w-full items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
              >
                Delete Fact (forget())
              </button>
            </div>
          </>
        )}

        {/* When clicking an AI Source Hub */}
        {target.type === 'hub' && sourceMeta && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-xs leading-relaxed text-white/70">
              This neural hub manages all memory facts originated from sessions with{' '}
              <span className="font-semibold text-white">{sourceMeta.name}</span>. It connects to the rest of the brain when other AIs share common topics or architectural decisions.
            </div>

            <div>
              <div className="mono text-[10px] font-medium uppercase tracking-widest text-white/40 mb-2">
                Facts in this Cluster ({allFacts.filter((f) => f.source === sourceMeta.id).length})
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {allFacts
                  .filter((f) => f.source === sourceMeta.id)
                  .map((sf) => (
                    <div
                      key={sf.id}
                      onClick={() => onSelectNode(sf)}
                      className="cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition hover:border-white/25 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="mono text-[10px] text-white/40">#{sf.id}</span>
                        <span className="mono text-[9px] text-white/30">
                          {new Date(sf.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-white/90 leading-relaxed">
                        {sf.content}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
