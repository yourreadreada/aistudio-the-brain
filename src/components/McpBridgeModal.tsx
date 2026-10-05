import React, { useState } from 'react';
import { brainStore } from '../services/brainStorage';
import { ApexLogo } from './ApexLogo';

interface McpBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrain: string;
}

export const McpBridgeModal: React.FC<McpBridgeModalProps> = ({
  isOpen,
  onClose,
  currentBrain,
}) => {
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);

  if (!isOpen) return null;

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        brain: {
          command: "python3",
          args: ["-m", "brain.server"],
          env: {
            BRAIN_DEFAULT: currentBrain,
          },
        },
      },
    },
    null,
    2
  );

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfigJson);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleCopySnapshot = () => {
    const snapshot = brainStore.exportContextSnapshot(currentBrain);
    navigator.clipboard.writeText(snapshot);
    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2000);
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
          MCP Bridge
        </h2>
        <p className="rise mono mt-1 text-[11px] text-ink-ghost">
          Ground any AI tool with your local memory.
        </p>

        <div className="rise mt-6 flex flex-col gap-4">
          {/* Quick Context Snapshot Copier */}
          <div className="rounded-xl border border-white/20 bg-black/30 p-3.5 backdrop-blur-md">
            <span className="mono text-[11px] text-ink-ghost block mb-1">
              Context Snapshot ({currentBrain})
            </span>
            <p className="text-xs text-ink-soft leading-relaxed mb-3">
              Copy formatted facts to paste into any new Claude or GPT chat to prime context instantly.
            </p>
            <button
              onClick={handleCopySnapshot}
              className="mono min-h-10 w-full rounded-xl bg-white/90 py-2.5 text-[12px] font-medium text-black transition hover:bg-white"
            >
              {copiedSnapshot ? 'Copied to Clipboard' : 'Copy context snapshot'}
            </button>
          </div>

          {/* Claude Desktop Config */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[11px] text-ink-ghost">
                claude_desktop_config.json
              </span>
              <button
                onClick={handleCopyConfig}
                className="mono text-[11px] text-ink-faint hover:text-ink"
              >
                {copiedConfig ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="rounded-xl border border-white/36 bg-black/40 p-3 font-mono text-[11px] text-ink-soft overflow-x-auto">
              {mcpConfigJson}
            </pre>
          </div>

          <button
            onClick={onClose}
            className="mono mt-2 text-center text-[11px] text-ink-ghost transition hover:text-ink"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
