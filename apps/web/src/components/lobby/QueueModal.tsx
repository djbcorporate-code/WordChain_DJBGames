import { CheckCircle2, Loader2, Sparkles, Swords, Trophy, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext.js';

export const QueueModal: React.FC = () => {
  const { queueStatus, matchFoundNotice, currentRoom, leaveQueue } = useGame();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(3);

  useEffect(() => {
    if (!queueStatus?.inQueue) {
      setElapsedSec(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [queueStatus?.inQueue]);

  // Handle Match Found 3-second countdown
  useEffect(() => {
    if (!matchFoundNotice) {
      setCountdownRemaining(3);
      return;
    }

    setCountdownRemaining(matchFoundNotice.countdownSec || 3);

    const interval = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchFoundNotice]);

  // If in live match or nothing to show, dismiss modal immediately
  if (currentRoom?.status === 'IN_PROGRESS' || (!queueStatus?.inQueue && !matchFoundNotice)) {
    return null;
  }

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMatched = !!matchFoundNotice;
  const isRanked = queueStatus?.mode === 'RANKED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6 overflow-hidden">
        {/* Glow backdrop */}
        <div
          className={`absolute top-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isMatched
              ? 'bg-emerald-500/20'
              : isRanked
              ? 'bg-indigo-500/25'
              : 'bg-accent-primary/20'
          }`}
        />

        {/* Radar Ring / Found Checkmark */}
        <div className="relative z-10 flex items-center justify-center">
          {isMatched ? (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-glowEmerald animate-pop">
              <CheckCircle2 className="w-10 h-10 text-slate-950" />
            </div>
          ) : (
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Pulsing radar waves */}
              <div className="absolute inset-0 rounded-full border-2 border-accent-secondary/40 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-accent-primary/60 animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-accent-secondary shadow-glow">
                {isRanked ? <Swords className="w-7 h-7 text-indigo-400" /> : <Users className="w-7 h-7" />}
              </div>
            </div>
          )}
        </div>

        {/* Text information */}
        <div className="relative z-10 space-y-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent-secondary">
            {isMatched
              ? 'Match Confirmed'
              : isRanked
              ? 'Competitive Ranked Queue (4-FFA)'
              : 'Casual Matchmaking Queue'}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {isMatched ? 'Match Found!' : isRanked ? 'Finding FFA Scholars...' : 'Searching for Scholars...'}
          </h3>
          <p className="text-xs text-slate-400">
            {isMatched
              ? `Entering Arena in ${countdownRemaining > 0 ? countdownRemaining : 1} second${countdownRemaining === 1 ? '' : 's'}`
              : isRanked
              ? 'Searching for 4 players within your Academic MMR window.'
              : 'Pairing you with 2 to 4 players for a casual word chain match.'}
          </p>
        </div>

        {/* Queue Metrics */}
        {!isMatched && (
          <div className="relative z-10 w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-around font-mono text-xs">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Elapsed</span>
              <span className="text-sm font-extrabold text-slate-200">{formatElapsed(elapsedSec)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Est. Wait</span>
              <span className="text-sm font-extrabold text-emerald-400">
                ~{queueStatus?.estimatedWaitSec || 3}s
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Queue Pos</span>
              <span className="text-sm font-extrabold text-indigo-400">
                #{queueStatus?.position || 1}
              </span>
            </div>
          </div>
        )}

        {/* Cancel button */}
        {!isMatched && (
          <button
            onClick={leaveQueue}
            className="relative z-10 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Search</span>
          </button>
        )}
      </div>
    </div>
  );
};
