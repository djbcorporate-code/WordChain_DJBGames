import { Send, ShieldAlert, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../utils/sound.js';

interface WordInputProps {
  requiredLetter: string;
  isMyTurn: boolean;
  disabled?: boolean;
  onSubmitWord: (word: string) => void;
  lastRejectionReason?: string | null;
  shakeTrigger?: number; // increments when a rejection occurs
}

export const WordInput: React.FC<WordInputProps> = ({
  requiredLetter,
  isMyTurn,
  disabled = false,
  onSubmitWord,
  lastRejectionReason,
  shakeTrigger = 0,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isThrottled, setIsThrottled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when turn switches to user
  useEffect(() => {
    if (isMyTurn && !disabled) {
      inputRef.current?.focus();
    }
  }, [isMyTurn, disabled]);

  // Clean input on turn change or starting letter shift
  useEffect(() => {
    setInputVal('');
  }, [requiredLetter]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isMyTurn || disabled || isThrottled) return;

    const trimmed = inputVal.trim();
    if (!trimmed) return;

    // Trigger submission
    onSubmitWord(trimmed);

    // Apply 400ms client-side input safety throttle
    setIsThrottled(true);
    setTimeout(() => {
      setIsThrottled(false);
    }, 400);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow English letters
    const filtered = e.target.value.replace(/[^a-zA-Z]/g, '');
    setInputVal(filtered);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-2">
      {/* Inline rejection message */}
      {lastRejectionReason && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 py-1 px-3 rounded-lg animate-shake select-none">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">{lastRejectionReason}</span>
        </div>
      )}

      {/* Input container */}
      <form
        onSubmit={handleSubmit}
        key={shakeTrigger}
        className={`relative flex items-center bg-slate-900 border-2 rounded-2xl shadow-xl transition-all ${
          shakeTrigger > 0 ? 'animate-shake border-rose-500 ring-2 ring-rose-500/40' : ''
        } ${
          isMyTurn
            ? 'border-accent-primary ring-2 ring-accent-primary/30'
            : 'border-slate-800 opacity-70 pointer-events-none'
        }`}
      >
        {/* Required Letter Badge */}
        <div className="pl-3.5 pr-2 flex items-center select-none">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-secondary text-white font-mono font-black text-base flex items-center justify-center shadow-glow">
            {requiredLetter.toUpperCase()}
          </span>
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={handleChange}
          disabled={!isMyTurn || disabled}
          placeholder={isMyTurn ? `Type a word starting with '${requiredLetter.toUpperCase()}'...` : 'Waiting for turn...'}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={25}
          className="flex-1 py-3 sm:py-3.5 px-2 bg-transparent text-slate-100 placeholder-slate-500 font-mono text-base sm:text-lg uppercase font-bold focus:outline-none"
        />

        {/* Submit Button */}
        <div className="pr-2">
          <button
            type="submit"
            disabled={!isMyTurn || disabled || !inputVal.trim() || isThrottled}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all select-none active:scale-95 ${
              isMyTurn && inputVal.trim() && !isThrottled
                ? 'bg-accent-primary hover:bg-indigo-500 text-white shadow-glow'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">Submit</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Helper caption */}
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-accent-secondary" /> Press <strong className="text-slate-300">Enter ↵</strong> to submit
        </span>
        <span>3–25 letters • No repeats</span>
      </div>
    </div>
  );
};
