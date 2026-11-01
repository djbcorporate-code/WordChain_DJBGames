import { ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

interface CurrentWordDisplayProps {
  currentWord: string;
  requiredLetter: string;
  roundNumber?: number;
  wordHistory?: string[];
  lastAcceptedByUsername?: string;
}

export const CurrentWordDisplay: React.FC<CurrentWordDisplayProps> = ({
  currentWord,
  requiredLetter,
  roundNumber = 1,
  wordHistory = [],
  lastAcceptedByUsername,
}) => {
  const letters = currentWord.toUpperCase().split('');
  const lastCharIndex = letters.length - 1;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Round & History Context */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
          Round {roundNumber}
        </span>
        {lastAcceptedByUsername && (
          <span className="flex items-center gap-1 text-slate-400">
            Chain by <strong className="text-slate-200">{lastAcceptedByUsername}</strong>
          </span>
        )}
      </div>

      {/* Primary Word Presentation */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {letters.map((char, index) => {
          const isTrailingLetter = index === lastCharIndex;

          return (
            <div
              key={`${char}-${index}`}
              className={`flex items-center justify-center rounded-xl font-mono font-black text-xl sm:text-3xl transition-all ${
                isTrailingLetter
                  ? 'w-10 h-12 sm:w-14 sm:h-16 bg-gradient-to-tr from-accent-primary to-accent-secondary text-white shadow-glow border-2 border-cyan-300 scale-110 z-10 animate-pop'
                  : 'w-8 h-10 sm:w-11 sm:h-14 bg-slate-900 border border-slate-700 text-slate-200'
              }`}
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* Target Instruction Pill */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-md">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          Next Word Must Start With
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-accent-secondary" />
        <span className="w-6 h-6 rounded-md bg-accent-secondary text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-glow">
          {requiredLetter.toUpperCase()}
        </span>
      </div>

      {/* Chain breadcrumbs (last 3 words) */}
      {wordHistory.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono overflow-x-auto max-w-full px-2 py-1">
          <Sparkles className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-600">Recent:</span>
          {wordHistory.slice(-4, -1).map((w, idx) => (
            <span key={idx} className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-800">
              {w.toUpperCase()}
              {idx < 2 && <span className="text-slate-700">→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
