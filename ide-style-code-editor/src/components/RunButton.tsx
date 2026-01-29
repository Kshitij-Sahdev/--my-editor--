'use client';

import { Play } from "lucide-react";

interface RunButtonProps {
  onClick: () => void;
  isRunning: boolean;
}

export default function RunButton({ onClick, isRunning }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white cursor-pointer transition-colors"
    >
      {isRunning ? (
        <span className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
      ) : (
        <Play size={14} />
      )}
      Run
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-black/20 rounded text-[10px] font-mono">
        <span>Ctrl</span>
        <span>+</span>
        <span>Enter</span>
      </kbd>
    </button>
  );
}
