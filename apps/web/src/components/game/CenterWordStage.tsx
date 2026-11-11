import { Delete, Flame, Send, ShieldAlert, Skull, Sparkles, Zap } from 'lucide-react';
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
  const isComposingRef = useRef(false);

  // Normalize prefix to uppercase
  const prefixChars = (requiredPrefix || 'T').toUpperCase().split('');
  const isRound20Plus = roundNumber >= 20;

  // Centralized deletion of the last typed character
  const handleBackspace = () => {
    setTypedSuffix((prev) => {
      if (prev.length === 0) return prev;
      const updated = prev.slice(0, -1);
      onTypingUpdate(updated);
      return updated;
    });
  };

  // Focus and safely position caret at end without disrupting active typing
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      requestAnimationFrame(() => {
        try {
          const len = inputRef.current?.value.length || 0;
          inputRef.current?.setSelectionRange(len, len);
        } catch (_) {
          // Safe fallback
        }
      });
    }
  };

  // Clear typed suffix and focus when turn changes or required prefix updates
  useEffect(() => {
    setTypedSuffix('');
    if (isMyTurn) {
      focusInput();
    }
  }, [requiredPrefix, isMyTurn]);

  // Autofocus when turn switches to user
  useEffect(() => {
    if (isMyTurn) {
      focusInput();
    }
  }, [isMyTurn]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFormSubmit();
      return;
    }

    if (e.key === 'Backspace') {
      // If cursor is at 0 or selection collapsed at start despite non-empty suffix,
      // native backspace won't delete anything on Android/iOS, so manually delete
      if (
        typedSuffix.length > 0 &&
        inputRef.current?.selectionStart === 0 &&
        inputRef.current?.selectionEnd === 0
      ) {
        e.preventDefault();
        handleBackspace();
      }
    }
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent;
    if (!nativeEvent) return;

    if (
      nativeEvent.inputType === 'deleteContentBackward' ||
      nativeEvent.inputType === 'deleteContentForward' ||
      nativeEvent.inputType === 'deleteWordBackward' ||
      nativeEvent.inputType === 'deleteHardLineBackward'
    ) {
      // If selection is at 0, standard browser delete won't delete anything on mobile,
      // so intercept and ensure the last letter is deleted!
      if (
        inputRef.current &&
        inputRef.current.selectionStart === 0 &&
        inputRef.current.selectionEnd === 0 &&
        typedSuffix.length > 0
      ) {
        e.preventDefault();
        handleBackspace();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isMyTurn) return;
    const raw = e.target.value;
    const prefixUpper = (requiredPrefix || '').toUpperCase();
    const maxSuffixLen = Math.max(1, 46 - prefixChars.length);
    let cleaned = raw.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, maxSuffixLen + prefixUpper.length);

    // If user starts typing the required prefix letter(s) (e.g. typing "ELEPHANTS" or "E" when prefix is "E"),
    // automatically strip the redundant leading prefix so only the lacking letters are added as the suffix!
    if (prefixUpper && cleaned.startsWith(prefixUpper)) {
      cleaned = cleaned.slice(prefixUpper.length);
    }
    cleaned = cleaned.slice(0, maxSuffixLen);

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
      onClick={() => {
        if (isMyTurn) {
          focusInput();
        }
      }}
      className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3 sm:gap-4 select-none cursor-pointer"
    >
      {/* Round & Mode Badge */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
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

        {prefixChars.length === 3 && (
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-mono font-black bg-rose-950/90 text-rose-300 border border-rose-500/60 shadow-glowRose animate-pulse">
            <Skull className="w-3.5 h-3.5 text-rose-400" /> 3-LETTER CHAIN
          </span>
        )}

        {lastAcceptedByUsername && (
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Last: <strong className="text-slate-200">{lastAcceptedByUsername}</strong>
          </span>
        )}
      </div>

      {/* Primary Animated Word Stage */}
      <div
        key={shakeTrigger}
        onClick={() => {
          if (isMyTurn) {
            focusInput();
          }
        }}
        className={`relative w-full bg-slate-900/70 border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center transition-all overflow-hidden cursor-text ${
          shakeTrigger > 0 ? 'animate-shake border-rose-500/80 ring-2 ring-rose-500/30' : ''
        } ${
          isMyTurn
            ? 'border-emerald-400 ring-4 sm:ring-8 ring-emerald-500/25 bg-slate-900/95 shadow-glowEmerald'
            : 'border-slate-800'
        }`}
      >
        {/* Real input overlay: Has real bounding rect, captures touch & virtual keyboard directly */}
        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          value={typedSuffix}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBeforeInput={handleBeforeInput}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            handleInputChange(e as any);
          }}
          disabled={!isMyTurn}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer caret-transparent text-base text-left font-mono"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="send"
        />

        {/* BIG Prominent Turn Indicator in Front of Player */}
        <div className="w-full flex flex-col items-center justify-center mb-3 sm:mb-4 pointer-events-none">
          {isMyTurn ? (
            <div className="flex flex-col items-center gap-1 animate-bounce-subtle">
              <div className="px-5 sm:px-8 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 text-slate-950 font-black text-xl sm:text-2xl md:text-3xl tracking-widest uppercase shadow-glowEmerald flex items-center gap-2.5 sm:gap-3 border-2 border-white/80 animate-pulse">
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 fill-slate-950 animate-bounce" />
                <span>⚡ YOUR TURN! ⚡</span>
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 fill-slate-950 animate-bounce" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-cyan-300 drop-shadow flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                Must start with <span className="font-mono font-black text-white text-base sm:text-lg px-2 py-0.5 rounded-lg bg-white/10 border border-white/20">&quot;{requiredPrefix}&quot;</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-mono font-semibold py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
              <span><strong>{activePlayerUsername}</strong> is currently typing...</span>
            </div>
          )}
        </div>

        {/* Central Letter Tiles Display (Locked Prefix + Smooth Pop Suffix) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 min-h-[56px] sm:min-h-[72px] pointer-events-none">
          {/* 1. Locked Prefix Tiles */}
          {prefixChars.map((char, index) => (
            <div
              key={`prefix-${char}-${index}`}
              className="relative flex flex-col items-center group"
            >
              <div className="w-10 h-13 sm:w-14 sm:h-18 flex items-center justify-center rounded-xl font-mono font-black text-2xl sm:text-4xl bg-gradient-to-tr from-accent-primary via-indigo-500 to-accent-secondary text-white shadow-glow border-2 border-cyan-300">
                {char}
              </div>
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
        <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500 font-mono px-2 pointer-events-none">
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

      {/* Mobile Controls (Backspace & Submit) for touch users when it's their turn */}
      {isMyTurn && (
        <div className="w-full flex items-center gap-2 pt-1 relative z-20">
          {/* Dedicated Backspace Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBackspace();
              focusInput();
            }}
            disabled={typedSuffix.length === 0}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
              typedSuffix.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-rose-500/30 active:scale-95 shadow-md cursor-pointer'
                : 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title="Delete last letter"
          >
            <Delete className="w-5 h-5 text-rose-400" />
            <span className="font-mono font-bold tracking-wider">DELETE</span>
          </button>

          {/* Submit Word Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFormSubmit();
            }}
            disabled={typedSuffix.trim().length === 0 || isThrottled}
            className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-glow ${
              typedSuffix.trim().length > 0 && !isThrottled
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <span>SUBMIT WORD</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
