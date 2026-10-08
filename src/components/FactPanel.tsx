import React, { useState, useEffect, useRef } from 'react';
import { Fact, SOURCE_PALETTE, getFactFileType, FILE_TYPE_CONFIG } from '../types/brain';
import { brainStore } from '../services/brainStorage';
import { parseSemanticSections } from '../services/semanticChunker';
import { BrainLogo } from './BrainLogo';

interface FactPanelProps {
  fact: Fact | null;
  onClose: () => void;
  onSaveCorrection: (id: number, newContent: string) => void;
  onDeleteFact: (id: number) => void;
  onUpdateTags?: (id: number, tags: string[]) => void;
}

export const FactPanel: React.FC<FactPanelProps> = ({
  fact,
  onClose,
  onSaveCorrection,
  onDeleteFact,
  onUpdateTags,
}) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [viewMode, setViewMode] = useState<'reader' | 'edit'>('reader');

  // Track the active fact id so we don't wipe editing state when fact metadata updates
  const lastFactIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (fact) {
      if (fact.id !== lastFactIdRef.current) {
        lastFactIdRef.current = fact.id;
        setContent(fact.content);
        setTags(fact.tags || []);
        setTagInput('');
        setIsSavedToast(false);
        setIsCopied(false);
        setIsConfirmingDelete(false);
        setViewMode('reader');
      }
    } else {
      lastFactIdRef.current = null;
    }
  }, [fact]);

  if (!fact) return null;

  const sourceMeta = SOURCE_PALETTE[fact.source] || {
    name: fact.source,
    color: '#ffffff',
    dotColor: '#ffffff',
  };

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSaveCorrection(fact.id, trimmed);
    if (onUpdateTags) {
      onUpdateTags(fact.id, tags);
    } else {
      brainStore.updateFactTags(fact.id, tags);
    }
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2600);
  };

  const handleDelete = () => {
    onDeleteFact(fact.id);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd || tagInput;
    const clean = raw.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    const updated = [...tags, clean];
    setTags(updated);
    setTagInput('');
    if (onUpdateTags) {
      onUpdateTags(fact.id, updated);
    } else {
      brainStore.updateFactTags(fact.id, updated);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    if (onUpdateTags) {
      onUpdateTags(fact.id, updated);
    } else {
      brainStore.updateFactTags(fact.id, updated);
    }
  };

  const availableSuggestions = brainStore
    .getAllTags(fact.brain)
    .filter((t) => !tags.includes(t))
    .slice(0, 5);

  const formattedDate = new Date(fact.updated_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-white/20 bg-[#050713]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-200 ease-out">
      {/* Top Brand & Close */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2.5 text-white">
          <BrainLogo size={16} className="text-white" />
          <span className="mono text-[13px] font-semibold text-white">THE BRAIN</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 transition hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
        {/* Node Heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium leading-tight text-white tracking-tight">
            Fact #{fact.id}
          </h2>
          <div className="flex items-center gap-1.5">
            {/* File Type Badge */}
            {(() => {
              const fileType = getFactFileType(fact);
              const meta = FILE_TYPE_CONFIG[fileType];
              return (
                <span
                  className="mono flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: meta.color,
                    backgroundColor: meta.color + '1a',
                    border: `1px solid ${meta.color}40`,
                  }}
                  title={meta.label}
                >
                  <span>{meta.iconSymbol}</span>
                  <span>{meta.badge}</span>
                </span>
              );
            })()}

            {/* AI Source Origin Badge */}
            <span
              className="mono flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase"
              style={{
                color: sourceMeta.color,
                backgroundColor: sourceMeta.color + '1a',
                border: `1px solid ${sourceMeta.color}33`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sourceMeta.color }} />
              {sourceMeta.name}
            </span>
          </div>
        </div>

        {/* Subtitle with File Name */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 mono text-[11px] text-white/45">
          <span>
            Brain: <span className="text-white/80">{fact.brain}</span>
          </span>
          <span>·</span>
          <span>Updated {formattedDate}</span>
          {fact.fileName && (
            <>
              <span>·</span>
              <span className="truncate text-white/70 bg-white/5 rounded px-1.5 py-0.5 border border-white/10" title={fact.fileName}>
                📄 {fact.fileName}
              </span>
            </>
          )}
          {fact.isUnifiedContextNode ? (
            <span className="text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5 font-semibold flex items-center gap-1">
              <span>🌳</span>
              <span>Unified Coherent Context Node</span>
              {fact.semanticSectionCount ? (
                <span className="text-amber-200/80 font-normal">({fact.semanticSectionCount} turns/sections)</span>
              ) : null}
            </span>
          ) : fact.isDocumentRoot ? (
            <span className="text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5 font-semibold">
              🌳 Document Hub
            </span>
          ) : null}
          {fact.parentId && (
            <span className="text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded px-1.5 py-0.5">
              ↳ Child Turn of #{fact.parentId}
            </span>
          )}
        </div>

        {/* Incremental Merge & Update History (if file was updated) */}
        {fact.mergeHistory && fact.mergeHistory.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
            <div className="flex items-center justify-between mono text-[10.5px] text-white/50">
              <span className="flex items-center gap-1.5 text-white/70 font-semibold">
                <span>🔄</span>
                <span>Incremental Update History</span>
              </span>
              <span className="text-amber-300/80">{fact.mergeHistory.length} event(s)</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {fact.mergeHistory.map((hist, hIdx) => (
                <div
                  key={hIdx}
                  className="rounded-lg bg-black/40 border border-white/5 p-2 text-[11px] leading-snug space-y-0.5"
                >
                  <div className="flex items-center justify-between text-white/40 mono text-[9.5px]">
                    <span className="capitalize text-emerald-400 font-medium">✓ {hist.action}</span>
                    <span>{new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-white/80">{hist.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Field */}
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="mono text-[11px] text-white/50">Memory Content</span>
              {content.length > 300 && (
                <div className="flex rounded-lg border border-white/15 bg-black/40 p-0.5 mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('reader')}
                    className={`px-2 py-0.5 rounded transition ${
                      viewMode === 'reader'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-2 py-0.5 rounded transition ${
                      viewMode === 'edit'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Edit / Raw
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="mono text-[11px] text-white/50 transition hover:text-white"
            >
              {isCopied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {viewMode === 'reader' && (content.includes('#### User') || content.includes('#### Assistant')) ? (
            /* Formatted Conversation Turns for Chat Logs */
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {content.split(/(?=#### (?:User|Assistant))/g).filter(Boolean).map((turn, tIdx) => {
                const isUser = turn.startsWith('#### User');
                const isAssistant = turn.startsWith('#### Assistant');
                const cleanBody = turn.replace(/^#### (?:User|Assistant)\s*/, '').trim();
                return (
                  <div
                    key={tIdx}
                    className={`rounded-xl p-3 text-xs leading-relaxed border ${
                      isUser
                        ? 'bg-white/[0.04] border-white/15 text-white/95'
                        : isAssistant
                        ? 'bg-[#18131d]/80 border-[#d85a30]/30 text-white/90'
                        : 'bg-black/40 border-white/10 text-white/80'
                    }`}
                  >
                    <div className="mono text-[10px] font-semibold uppercase mb-1.5 flex items-center gap-1.5">
                      <span>{isUser ? '👤 User' : isAssistant ? '🤖 Assistant' : '📝 Note'}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{cleanBody}</div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'reader' && content.length > 400 ? (
            /* Formatted Reader View for Long Documents */
            <div className="rounded-xl border border-white/20 bg-black/40 p-3.5 text-xs text-white leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap scrollbar-thin">
              {content}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={Math.min(12, Math.max(5, Math.ceil(content.length / 55)))}
              placeholder="Fact text..."
              className="w-full rounded-xl border border-white/20 bg-black/40 p-3.5 text-xs text-white leading-relaxed outline-none backdrop-blur-md transition placeholder:text-white/30 focus:border-white/45 focus:bg-black/60 font-mono"
            />
          )}

          {(viewMode === 'edit' || (!content.includes('#### User') && content.length <= 400)) && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!content.trim()}
              className={`mono min-h-10 w-full rounded-xl py-2.5 text-xs font-semibold transition active:scale-[0.98] ${
                isSavedToast
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/95 text-black hover:bg-white disabled:opacity-40'
              }`}
            >
              {isSavedToast ? '✓ Saved Correction' : 'Save correction'}
            </button>
          )}
        </div>

        {/* Custom Tagging Section */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between">
            <label className="mono text-[11px] uppercase tracking-wider text-white/50">
              Categorization Tags
            </label>
            <span className="mono text-[10px] text-white/40">
              {tags.length} tag{tags.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Active Tags Pills */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <p className="mono text-[11px] text-white/30 italic">No custom tags yet</p>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="mono group flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/20"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 text-white/40 transition hover:text-white"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add Tag Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTag();
            }}
            className="mt-3 flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Add tag (e.g. audio-ml, api)..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mono flex-1 rounded-lg border border-white/20 bg-black/40 px-2.5 py-1 text-[11.5px] text-white placeholder-white/30 outline-none transition focus:border-white/45"
            />
            <button
              type="submit"
              disabled={!tagInput.trim()}
              className="mono rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/20 disabled:opacity-40"
            >
              + Add
            </button>
          </form>

          {/* Quick Suggested Tags */}
          {availableSuggestions.length > 0 && (
            <div className="mt-3">
              <span className="mono text-[10px] text-white/40">Suggested tags:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {availableSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddTag(sug)}
                    className="mono rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50 transition hover:border-white/25 hover:text-white"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Fact with 2-step inline confirmation (No window.confirm needed!) */}
        <div className="mt-7 border-t border-white/10 pt-4">
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <p className="mono text-xs text-rose-200">
                Are you sure? Delete node #{fact.id}?
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="mono flex-1 rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-md shadow-rose-950/40 transition active:scale-[0.98]"
                >
                  Yes, Delete Fact
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="mono rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="mono w-full text-center text-xs text-rose-400/80 transition hover:text-rose-300"
            >
              Delete this neural node
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
