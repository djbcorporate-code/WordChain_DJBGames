import { Flame, Send, ShieldAlert, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface CenterWordStageProps {
  requiredPrefix: string;
  roundNumber: number;
  isMyTurn: boolean;
  activePlayerUsername: string;
  peerTypingSuffix?: string;
  wordHistory?: string[];
  lastAcceptedByUsername?: string;
  lastRejectionReason?: string | null;
  shakeTrigger?: number;
  onSubmitSuffix: (suffix: string) => void;
  onTypingUpdate: (suffix: string) => void;
}

export const CenterWordStage: React.FC<CenterWordStageProps> = ({
  requiredPrefix,
  roundNumber,
  isMyTurn,
  activePlayerUsername,
  peerTypingSuffix = '',
  wordHistory = [],
  lastAcceptedByUsername,
  lastRejectionReason,
  shakeTrigger = 0,
  onSubmitSuffix,
  onTypingUpdate,
}) => {
  const [typedSuffix, setTypedSuffix] = useState('');
  const [isThrottled, setIsThrottled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize prefix to uppercase
  const prefixChars = (requiredPrefix || 'T').toUpperCase().split('');
  const isRound20Plus = roundNumber >= 20;

  // Clear typed suffix when turn changes or required prefix updates
  useEffect(() => {
    setTypedSuffix('');
    if (isMyTurn) {
      inputRef.current?.focus();
    }
  }, [requiredPrefix, isMyTurn]);

  // Autofocus when turn switches to user
  useEffect(() => {
    if (isMyTurn) {
      inputRef.current?.focus();
    }
  }, [isMyTurn]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isMyTurn) return;
    const raw = e.target.value;
    // Allow only letters, uppercase, enforce maximum word length of 46
    const maxSuffixLen = Math.max(1, 46 - prefixChars.length);
    const cleaned = raw.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, maxSuffixLen);

    setTypedSuffix(cleaned);
    onTypingUpdate(cleaned);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isMyTurn || isThrottled) return;

    const trimmed = typedSuffix.trim();
    if (!trimmed) return;

    onSubmitSuffix(trimmed);

    // Short submission throttle for double-click safety
    setIsThrottled(true);
    setTimeout(() => {
      setIsThrottled(false);
    }, 350);
  };

  // Determine which suffix letters to display: user's live typing or opponent's live typing
  const activeSuffix = isMyTurn ? typedSuffix : peerTypingSuffix;
  const suffixChars = activeSuffix.split('');

  return (
    <div
      onClick={() => isMyTurn && inputRef.current?.focus()}
      className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 sm:gap-4 select-none cursor-pointer"
    >
      {/* Hidden real input capturing all keyboard and mobile soft-keyboard strokes */}
      <input
        ref={inputRef}
        type="text"
        value={typedSuffix}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleFormSubmit();
          }
        }}
        disabled={!isMyTurn}
        className="opacity-0 absolute -z-50 pointer-events-none w-0 h-0"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {/* Round & Mode Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all ${
            isRound20Plus
              ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-glow'
              : 'bg-slate-900/80 text-slate-300 border border-slate-700/80'
          }`}
        >
          {isRound20Plus && <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
          Round {roundNumber}
          {isRound20Plus && (
            <span className="text-[10px] text-rose-300 font-extrabold ml-1">
              • 2-LETTER CHAIN
            </span>
          )}
        </span>

        {lastAcceptedByUsername && (
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Last: <strong className="text-slate-200">{lastAcceptedByUsername}</strong>
          </span>
        )}
      </div>

      {/* Primary Animated Word Stage */}
      <div
        key={shakeTrigger}
        className={`w-full bg-slate-900/70 border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center transition-all ${
          shakeTrigger > 0 ? 'animate-shake border-rose-500/80 ring-2 ring-rose-500/30' : ''
        } ${
          isMyTurn
            ? 'border-accent-primary/80 ring-4 ring-accent-primary/20 bg-slate-900/90'
            : 'border-slate-800'
        }`}
      >
        {/* Turn prompt message */}
        <div className="text-xs sm:text-sm font-semibold tracking-wide mb-3 sm:mb-4 flex items-center gap-1.5">
          {isMyTurn ? (
            <span className="text-accent-secondary flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Your Turn! Type lacking letters (e.g. for &apos;TIME&apos;, type &apos;IME&apos;)
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <strong>{activePlayerUsername}</strong> is typing...
            </span>
          )}
        </div>

        {/* Central Letter Tiles Display (Locked Prefix + Smooth Pop Suffix) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 min-h-[56px] sm:min-h-[72px]">
          {/* 1. Locked Prefix Tiles */}
          {prefixChars.map((char, index) => (
            <div
              key={`prefix-${char}-${index}`}
              className="relative flex flex-col items-center group"
            >
              <div className="w-10 h-13 sm:w-14 sm:h-18 flex items-center justify-center rounded-xl font-mono font-black text-2xl sm:text-4xl bg-gradient-to-tr from-accent-primary via-indigo-500 to-accent-secondary text-white shadow-glow border-2 border-cyan-300">
                {char}
              </div>
              <span className="absolute -bottom-4 text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-tighter opacity-80">
                Prefix
              </span>
            </div>
          ))}

          {/* 2. Popping Suffix Letters */}
          {suffixChars.map((char, index) => (
            <div
              key={`suffix-${char}-${index}`}
              className="w-9 h-12 sm:w-13 sm:h-16 flex items-center justify-center rounded-xl font-mono font-black text-xl sm:text-3xl bg-slate-800/90 border-2 border-indigo-400 text-white shadow-lg animate-tile-pop"
            >
              {char}
            </div>
          ))}

          {/* Empty slot placeholder with pulsing cursor when waiting for letters */}
          {suffixChars.length === 0 && (
            <div className="w-9 h-12 sm:w-13 sm:h-16 flex items-center justify-center rounded-xl font-mono font-bold text-xl sm:text-3xl bg-slate-950/60 border-2 border-dashed border-slate-700 text-slate-500">
              {isMyTurn ? (
                <span className="w-1.5 h-6 sm:h-8 bg-accent-secondary animate-pulse rounded-full" />
              ) : (
                <span className="text-slate-600 text-sm font-mono">...</span>
              )}
            </div>
          )}
        </div>

        {/* Word Length Counter & Tip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono px-2">
          <span>
            Total: <strong className="text-slate-300">{prefixChars.length + suffixChars.length}</strong> / 46
          </span>
          <span className="hidden sm:inline">
            {isMyTurn ? 'Type lacking letters only • Enter to submit' : 'Letters sync in real-time'}
          </span>
          <span>No repeats</span>
        </div>
      </div>

      {/* Inline rejection message underneath the stage */}
      {lastRejectionReason && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 py-1.5 px-4 rounded-xl animate-shake">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{lastRejectionReason}</span>
        </div>
      )}

      {/* Mobile Submit Button for touch users when it's their turn */}
      {isMyTurn && (
        <div className="w-full flex items-center gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFormSubmit();
            }}
            disabled={typedSuffix.trim().length === 0 || isThrottled}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-glow ${
              typedSuffix.trim().length > 0 && !isThrottled
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <span>SUBMIT WORD</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recent chain breadcrumbs */}
      {wordHistory.length > 1 && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono overflow-x-auto no-scrollbar max-w-full px-2 py-0.5">
          <span className="text-slate-600 shrink-0">Chain:</span>
          {wordHistory.slice(-4, -1).map((w, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 shrink-0 text-slate-300 font-semibold"
            >
              {w.toUpperCase()}
              {idx < 2 && <span className="text-slate-600">→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
