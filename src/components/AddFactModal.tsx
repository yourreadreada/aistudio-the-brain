import React, { useState } from 'react';
import { AISource, SOURCE_PALETTE } from '../types/brain';
import { ApexLogo } from './ApexLogo';

interface AddFactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrain: string;
  brains: string[];
  onAddFact: (brain: string, content: string, source: AISource) => void;
}

export const AddFactModal: React.FC<AddFactModalProps> = ({
  isOpen,
  onClose,
  currentBrain,
  brains,
  onAddFact,
}) => {
  const [targetBrain, setTargetBrain] = useState(currentBrain);
  const [source, setSource] = useState<AISource>('claude');
  const [content, setContent] = useState('');
  const [customBrain, setCustomBrain] = useState('');
  const [isCreatingBrain, setIsCreatingBrain] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const chosenBrain = isCreatingBrain
      ? customBrain.trim().toLowerCase() || currentBrain
      : targetBrain;

    onAddFact(chosenBrain, content.trim(), source);
    setContent('');
    setIsCreatingBrain(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog styled like Apex login card */}
      <div className="relative w-full max-w-[340px] rounded-2xl border border-white/20 bg-[#050713]/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="rise flex items-center gap-2.5 text-ink-faint">
            <ApexLogo size={15} />
            <span className="mono text-[13px]">APEX</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-ghost transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        <h2 className="rise mt-6 text-[22px] leading-tight text-ink">
          Store a fact
        </h2>
        <p className="rise mono mt-1 text-[11px] text-ink-ghost">
          Added to your local memory without re-explaining.
        </p>

        <form onSubmit={handleSubmit} className="rise mt-6 flex flex-col gap-3">
          {/* Target Brain */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[11px] text-ink-ghost">Brain</span>
              <button
                type="button"
                onClick={() => setIsCreatingBrain(!isCreatingBrain)}
                className="mono text-[11px] text-ink-faint hover:text-ink"
              >
                {isCreatingBrain ? 'Choose existing' : '+ New'}
              </button>
            </div>

            {isCreatingBrain ? (
              <input
                type="text"
                placeholder="brain name..."
                value={customBrain}
                onChange={(e) => setCustomBrain(e.target.value)}
                className="w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-2.5 text-[14px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45"
              />
            ) : (
              <select
                value={targetBrain}
                onChange={(e) => setTargetBrain(e.target.value)}
                className="w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-2.5 text-[13px] text-ink outline-none backdrop-blur-md transition focus:border-white/52"
              >
                {brains.map((b) => (
                  <option key={b} value={b} className="bg-[#050713] text-white">
                    {b}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* AI Source Origin */}
          <div>
            <span className="mono block text-[11px] text-ink-ghost mb-1">
              Source Origin
            </span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as AISource)}
              className="w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-2.5 text-[13px] text-ink outline-none backdrop-blur-md transition focus:border-white/52"
            >
              {(Object.keys(SOURCE_PALETTE) as AISource[]).map((srcKey) => (
                <option key={srcKey} value={srcKey} className="bg-[#050713] text-white">
                  {SOURCE_PALETTE[srcKey].name} ({srcKey})
                </option>
              ))}
            </select>
          </div>

          {/* Fact Content */}
          <div>
            <span className="mono block text-[11px] text-ink-ghost mb-1">
              Content
            </span>
            <textarea
              required
              rows={4}
              placeholder="e.g. Dog translator uses PyTorch MFCC audio pipeline at 22050Hz."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-white/36 bg-black/30 p-3.5 text-[14px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45"
            />
          </div>

          <button
            type="submit"
            disabled={!content.trim()}
            className="mono min-h-11 w-full rounded-xl bg-white/90 py-3 text-[12px] font-medium text-black transition hover:bg-white disabled:opacity-50 pointer-fine:min-h-0 pointer-fine:py-3 mt-2"
          >
            Store fact
          </button>
        </form>
      </div>
    </div>
  );
};
