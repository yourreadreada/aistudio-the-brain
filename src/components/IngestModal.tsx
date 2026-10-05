import React, { useState } from 'react';
import { AISource, SOURCE_PALETTE } from '../types/brain';
import { ApexLogo } from './ApexLogo';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrain: string;
  brains: string[];
  onIngest: (brain: string, source: AISource, rawText: string, chunkSize: number) => number;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  currentBrain,
  brains,
  onIngest,
}) => {
  const [brain, setBrain] = useState(currentBrain);
  const [source, setSource] = useState<AISource>('claude');
  const [chunkSize, setChunkSize] = useState(1200);
  const [rawText, setRawText] = useState('');
  const [ingestedCount, setIngestedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const paragraphs = rawText
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const estimatedChunks: string[] = [];
  let current = '';
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > chunkSize) {
      estimatedChunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) estimatedChunks.push(current);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setRawText(text);
    };
    reader.readAsText(file);
  };

  const handleIngest = () => {
    if (!rawText.trim()) return;
    const count = onIngest(brain, source, rawText, chunkSize);
    setIngestedCount(count);
    setTimeout(() => {
      setIngestedCount(null);
      setRawText('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/20 bg-[#050713]/95 p-6 shadow-2xl backdrop-blur-2xl">
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
          Ingest chat export
        </h2>
        <p className="rise mono mt-1 text-[11px] text-ink-ghost">
          Splits chat conversations into searchable memory facts.
        </p>

        <div className="rise mt-6 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mono block text-[11px] text-ink-ghost mb-1">
                Brain
              </span>
              <select
                value={brain}
                onChange={(e) => setBrain(e.target.value)}
                className="w-full rounded-xl border border-white/36 bg-black/30 px-3 py-2 text-[13px] text-ink outline-none backdrop-blur-md transition focus:border-white/52"
              >
                {brains.map((b) => (
                  <option key={b} value={b} className="bg-[#050713] text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mono block text-[11px] text-ink-ghost mb-1">
                Source
              </span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as AISource)}
                className="w-full rounded-xl border border-white/36 bg-black/30 px-3 py-2 text-[13px] text-ink outline-none backdrop-blur-md transition focus:border-white/52"
              >
                {(Object.keys(SOURCE_PALETTE) as AISource[]).map((src) => (
                  <option key={src} value={src} className="bg-[#050713] text-white">
                    {SOURCE_PALETTE[src].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[11px] text-ink-ghost">
                Paste chat export or markdown
              </span>
              <label className="mono cursor-pointer text-[11px] text-ink-faint hover:text-ink">
                <span>Upload file</span>
                <input
                  type="file"
                  accept=".md,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste exported chat here..."
              className="w-full rounded-xl border border-white/36 bg-black/30 p-3.5 text-[14px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45 font-mono"
            />
          </div>

          {rawText.trim() && (
            <p className="mono text-[11px] text-ink-faint">
              {estimatedChunks.length} fact chunk(s) will be created ({chunkSize} char max)
            </p>
          )}

          <button
            type="button"
            onClick={handleIngest}
            disabled={!rawText.trim() || ingestedCount !== null}
            className="mono min-h-11 w-full rounded-xl bg-white/90 py-3 text-[12px] font-medium text-black transition hover:bg-white disabled:opacity-50 pointer-fine:min-h-0 pointer-fine:py-3 mt-2"
          >
            {ingestedCount !== null
              ? `Ingested ${ingestedCount} facts`
              : `Ingest ${estimatedChunks.length || 0} facts`}
          </button>
        </div>
      </div>
    </div>
  );
};
