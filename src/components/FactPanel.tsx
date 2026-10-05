import React, { useState, useEffect } from 'react';
import { Fact, SOURCE_PALETTE } from '../types/brain';
import { ApexLogo } from './ApexLogo';

interface FactPanelProps {
  fact: Fact | null;
  onClose: () => void;
  onSaveCorrection: (id: number, newContent: string) => void;
  onDeleteFact: (id: number) => void;
}

export const FactPanel: React.FC<FactPanelProps> = ({
  fact,
  onClose,
  onSaveCorrection,
  onDeleteFact,
}) => {
  const [content, setContent] = useState('');
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (fact) {
      setContent(fact.content);
      setIsSavedToast(false);
      setIsCopied(false);
    }
  }, [fact]);

  if (!fact) return null;

  const sourceMeta = SOURCE_PALETTE[fact.source] || {
    name: fact.source,
    color: '#ffffff',
    dotColor: '#ffffff',
  };

  const handleSave = () => {
    if (!content.trim()) return;
    onSaveCorrection(fact.id, content.trim());
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete fact #${fact.id}?`)) {
      onDeleteFact(fact.id);
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formattedDate = new Date(fact.updated_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col border-l border-white/20 bg-[#050713]/95 p-6 shadow-2xl backdrop-blur-2xl transition-transform duration-200 ease-out">
      {/* Top Brand & Close */}
      <div className="flex items-center justify-between">
        <div className="rise flex items-center gap-2.5 text-ink-faint">
          <ApexLogo size={15} />
          <span className="mono text-[13px]">APEX</span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-ghost transition hover:text-ink"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Heading matching Login page */}
      <h2 className="rise mt-6 text-[22px] leading-tight text-ink">
        Fact #{fact.id}
      </h2>

      {/* Subtitle */}
      <p className="rise mono mt-1 text-[11px] text-ink-ghost">
        Source: {sourceMeta.name} · Updated {formattedDate}
      </p>

      {/* Form Area matching Login form */}
      <div className="rise mt-6 flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="mono text-[11px] text-ink-ghost">Content</span>
          <button
            onClick={handleCopy}
            className="mono text-[11px] text-ink-ghost transition hover:text-ink"
          >
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Fact text..."
          className="w-full flex-1 rounded-xl border border-white/36 bg-black/30 p-3.5 text-[15px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45 pointer-fine:py-3 pointer-fine:text-[14px]"
        />

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={!content.trim() || content.trim() === fact.content}
            className="mono min-h-11 w-full rounded-xl bg-white/90 py-3 text-[12px] font-medium text-black transition hover:bg-white disabled:opacity-50 pointer-fine:min-h-0 pointer-fine:py-3"
          >
            {isSavedToast ? 'Correction Saved' : 'Save correction'}
          </button>

          <button
            onClick={handleDelete}
            className="mono mt-3 w-full text-center text-[11px] text-ink-ghost transition hover:text-rose-300"
          >
            Delete fact
          </button>
        </div>
      </div>
    </div>
  );
};
