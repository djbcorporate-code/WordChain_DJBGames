import { MATH_PLACEMENT_POINTS, MathOperation } from '@wordchain/shared';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Divide,
  Hash,
  Lock,
  LogOut,
  Minus,
  Plus,
  Send,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { PostMatchModal } from '../components/game/PostMatchModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useMathGame } from '../context/MathGameContext.js';
import { OpenMicControlBar } from '../components/voice/OpenMicControlBar.js';

const OP_BADGE: Record<
  MathOperation,
  { label: string; symbol: string; colorClass: string; icon: React.ReactNode }
> = {
  ADD: {
    label: 'ADDITION',
    symbol: '+',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    icon: <Plus className="w-3.5 h-3.5" />,
  },
  SUBTRACT: {
    label: 'SUBTRACTION',
    symbol: '−',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
    icon: <Minus className="w-3.5 h-3.5" />,
  },
  MULTIPLY: {
    label: 'MULTIPLICATION',
    symbol: '×',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    icon: <X className="w-3.5 h-3.5" />,
  },
  DIVIDE: {
    label: 'DIVISION · 4 CHOICES',
    symbol: '÷',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    icon: <Divide className="w-3.5 h-3.5" />,
  },
};

export const MathLiveArena: React.FC = () => {
  const { user } = useAuth();
  const {
    mathRoom,
    roundResult,
    recentSolves,
    answerError,
    matchWinner,
    submitPick,
    submitAnswer,
    leaveRoom,
    resetRematch,
  } = useMathGame();

  const [answerInput, setAnswerInput] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roundState = mathRoom?.roundState;
  const me = mathRoom?.players.find((p) => p.userId === user?.id);

  // Sync remaining timer smoothly to server deadline
  useEffect(() => {
    if (!roundState?.phaseDeadlineUtc) {
      setRemainingMs(0);
      return;
    }

    const clientOffset = roundState.serverNowUtc - Date.now();
    const updateTimer = () => {
      const estimatedServerNow = Date.now() + clientOffset;
      setRemainingMs(Math.max(0, roundState.phaseDeadlineUtc - estimatedServerNow));
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 100);
    return () => window.clearInterval(interval);
  }, [roundState?.roundNumber, roundState?.phase, roundState?.phaseDeadlineUtc, roundState?.serverNowUtc]);

  // Reset per-round local state & focus input on RACING phase for +, -, x
  useEffect(() => {
    setAnswerInput('');
    setSelectedChoice(null);
    if (roundState?.phase === 'RACING' && roundState.operation !== 'DIVIDE') {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [roundState?.roundNumber, roundState?.phase, roundState?.operation]);

  if (!mathRoom || !user) return null;

  const isHost = mathRoom.hostUserId === user.id;
  const sortedPlayers = [...mathRoom.players].sort((a, b) => b.score - a.score);
  const myStandingRank = sortedPlayers.findIndex((p) => p.userId === user.id) + 1;

  const totalPhaseMs = Math.max(1000, (roundState?.phaseDurationSec || 15) * 1000);
  const progressPct = Math.min(100, Math.max(0, (remainingMs / totalPhaseMs) * 100));
  const remainingSecDisplay =
    roundState?.phase === 'PICKING' ? (remainingMs / 1000).toFixed(1) : Math.ceil(remainingMs / 1000).toString();
  const isUrgent = roundState?.phase === 'RACING' && remainingMs <= 5000;

  const opMeta = roundState ? OP_BADGE[roundState.operation] : OP_BADGE.ADD;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || !roundState || roundState.phase !== 'RACING' || roundState.operation === 'DIVIDE') return;
    if (me?.solvedThisRound) return;
    submitAnswer(answerInput.trim());
    setAnswerInput('');
    window.setTimeout(() => inputRef.current?.focus(), 20);
  };

  const toggleNegativeSign = () => {
    setAnswerInput((prev) => {
      if (prev.startsWith('-')) return prev.slice(1);
      return `-${prev}`;
    });
    inputRef.current?.focus();
  };

  const handleDivisionChoice = (choice: string) => {
    if (!roundState || roundState.phase !== 'RACING' || me?.solvedThisRound || me?.lockedOutThisRound) return;
    setSelectedChoice(choice);
    submitAnswer(choice);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Arena HUD */}
      <header className="shrink-0 bg-surface/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-black text-xs sm:text-sm shrink-0">
            ROUND {roundState?.roundNumber || 1}/{roundState?.totalRounds || 10}
          </div>

          {roundState && (
            <div
              className={`px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 truncate ${opMeta.colorClass}`}
            >
              {opMeta.icon}
              <span className="truncate">{opMeta.label}</span>
            </div>
          )}
        </div>

        {/* Countdown Timer Pill */}
        {roundState && (roundState.phase === 'PICKING' || roundState.phase === 'RACING') && (
          <div
            className={`px-3 sm:px-4 py-1 rounded-2xl border font-mono font-black text-sm sm:text-lg flex items-center gap-1.5 transition-colors ${
              roundState.phase === 'PICKING'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : isUrgent
                ? 'bg-rose-500/25 border-rose-400 text-rose-200 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{remainingSecDisplay}s</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Rank #{myStandingRank}</span>
            <span className="text-amber-300 font-black">{me?.score || 0} pts</span>
          </div>

          <button
            onClick={leaveRoom}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Leave Match"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Progress Timer Strip */}
      <div className="h-1.5 w-full bg-slate-900 shrink-0">
        <div
          className={`h-full transition-all duration-100 ${
            roundState?.phase === 'PICKING'
              ? 'bg-gradient-to-r from-cyan-400 to-indigo-400'
              : isUrgent
              ? 'bg-gradient-to-r from-rose-500 to-orange-500'
              : 'bg-gradient-to-r from-amber-400 to-orange-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Player Scoreboard Strip (2–6 players) */}
      <div className="shrink-0 bg-slate-950/60 border-b border-slate-800/80 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 min-w-0">
          {mathRoom.players.map((p, idx) => {
            const isMe = p.userId === user.id;
            const solveInfo = recentSolves.find((s) => s.userId === p.userId);
            return (
              <div
                key={p.userId}
                className={`rounded-xl px-2.5 py-1.5 border flex items-center justify-between gap-2 text-xs transition-all ${
                  p.solvedThisRound
                    ? 'bg-emerald-500/15 border-emerald-400/50'
                    : p.lockedOutThisRound
                    ? 'bg-rose-500/10 border-rose-500/30 opacity-75'
                    : isMe
                    ? 'bg-amber-500/10 border-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-bold text-slate-100 truncate">
                    <span className="text-[10px] font-mono text-slate-500">P{idx + 1}</span>
                    <span className={`truncate ${isMe ? 'text-amber-300' : ''}`}>{p.username}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="text-amber-300 font-black">{p.score} pts</span>
                    {roundState?.phase === 'PICKING' ? (
                      <span className={p.hasPicked ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                        {p.hasPicked ? '· Picked ✓' : '· Picking...'}
                      </span>
                    ) : p.pickedNumber !== undefined ? (
                      <span className="text-indigo-300 font-bold">· #{p.pickedNumber}</span>
                    ) : null}
                  </div>
                </div>

                {solveInfo && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 font-mono font-black text-[10px] shrink-0">
                    #{solveInfo.placement}
                  </span>
                )}
                {p.lockedOutThisRound && !p.solvedThisRound && (
                  <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Dynamic Game Stage */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center space-y-4 sm:space-y-5 my-auto">
          {/* COUNTDOWN PHASE */}
          {mathRoom.status === 'COUNTDOWN' && (
            <div className="text-center space-y-3 animate-fadeIn p-8 rounded-3xl bg-card border border-slate-800 shadow-2xl">
              <Zap className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
              <h2 className="text-2xl sm:text-4xl font-black text-white">MathBlitz Match Starting!</h2>
              <p className="text-sm text-slate-400">
                10 Rounds · Pick random numbers 1–99 in 3 seconds · Race to solve!
              </p>
            </div>
          )}

          {/* PICKING PHASE (3 Seconds, 12 Random 1–99 Numbers) */}
          {mathRoom.status === 'IN_PROGRESS' && roundState?.phase === 'PICKING' && (
            <div className="w-full max-w-2xl bg-card border border-cyan-500/30 rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 text-center animate-fadeIn">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-black">
                  <Hash className="w-3.5 h-3.5" /> STEP 1 · 3-SECOND NUMBER PICK
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-white">
                  {me?.hasPicked ? `Locked In: ${me.pickedNumber}!` : 'Pick Any Number (1–99)!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {me?.hasPicked
                    ? 'Waiting for other players to pick (auto-picks on timeout)...'
                    : `Next equation uses ${opMeta.label} (${opMeta.symbol}). Tap fast — random auto-pick at 0.0s!`}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {roundState.pickOptions.map((num) => {
                  const isSelected = me?.hasPicked && me.pickedNumber === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={!!me?.hasPicked}
                      onClick={() => submitPick(num)}
                      className={`py-3.5 sm:py-5 rounded-2xl border font-mono font-black text-2xl sm:text-3xl transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 border-white scale-105 shadow-glow'
                          : me?.hasPicked
                          ? 'bg-slate-900/40 border-slate-800/70 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-cyan-500/20 border-slate-700 hover:border-cyan-400 text-white active:scale-95 cursor-pointer shadow-md'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RACING PHASE (Show Picks + Equation + Input/Choices) */}
          {mathRoom.status === 'IN_PROGRESS' && roundState?.phase === 'RACING' && (
            <div className="w-full max-w-3xl bg-card border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-6 animate-fadeIn">
              {/* Revealed Player Picks Strip */}
              {roundState.picks && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {roundState.picks.map((pick, idx) => (
                    <div
                      key={pick.userId}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
                        pick.userId === user.id
                          ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500">P{idx + 1}</span>
                      <span className="truncate max-w-[90px]">{pick.username}:</span>
                      <span className="text-white font-black text-sm">{pick.number}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Massive Equation Stage */}
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 px-4 py-5 sm:py-8 text-center shadow-inner">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block mb-2">
                  Solve as Fast as Possible · Top Points: {MATH_PLACEMENT_POINTS[0]} pts
                </span>
                <div className="text-2xl sm:text-4xl md:text-5xl font-mono font-black text-white tracking-tight break-words">
                  {roundState.equationDisplay}
                </div>
              </div>

              {/* Player Answer Section */}
              {me?.solvedThisRound ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-lg">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>
                      Correct! Placement #{me.roundPlacement} (+{me.roundPointsEarned} pts)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    Waiting for remaining players or timer...
                  </p>
                </div>
              ) : roundState.operation === 'DIVIDE' && roundState.choices ? (
                /* DIVISION: 4 CLICKABLE CHOICES ONLY (NO MANUAL INPUT) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="text-rose-300 font-bold flex items-center gap-1.5">
                      <Divide className="w-3.5 h-3.5" /> Select the exact answer (1 attempt only!)
                    </span>
                    {me?.lockedOutThisRound && (
                      <span className="text-rose-400 font-black">LOCKED OUT THIS ROUND</span>
                    )}
                  </div>

                  {me?.lockedOutThisRound || answerError?.lockedOut ? (
                    <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-center text-rose-300 font-bold text-sm flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Wrong choice! Locked out until the next round.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {roundState.choices.map((choice) => {
                        const isPickedWrong = selectedChoice === choice && answerError;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => handleDivisionChoice(choice)}
                            className={`py-4 sm:py-5 px-4 rounded-2xl border font-mono font-black text-xl sm:text-2xl transition-all cursor-pointer active:scale-95 ${
                              isPickedWrong
                                ? 'bg-rose-500/20 border-rose-400 text-rose-200 animate-shake'
                                : 'bg-slate-900 hover:bg-amber-500/20 border-slate-700 hover:border-amber-400 text-white shadow-md'
                            }`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ADD, SUBTRACT, MULTIPLY: MANUAL TYPED ANSWER */
                <form onSubmit={handleManualSubmit} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleNegativeSign}
                      className="px-3.5 py-3.5 sm:py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono font-black text-base text-amber-300 shrink-0 cursor-pointer"
                      title="Toggle negative sign (-)"
                    >
                      +/−
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="decimal"
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Type answer (Enter)"
                      autoFocus
                      className={`flex-1 min-w-0 bg-slate-950 border rounded-2xl px-4 py-3 sm:py-4 font-mono font-black text-xl sm:text-2xl text-white placeholder-slate-600 outline-none transition-all ${
                        answerError ? 'border-rose-500 animate-shake' : 'border-slate-700 focus:border-amber-400'
                      }`}
                    />

                    <button
                      type="submit"
                      disabled={!answerInput.trim()}
                      className="px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-glow shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Submit</span>
                    </button>
                  </div>

                  {answerError && (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{answerError.message}</span>
                    </div>
                  )}
                </form>
              )}

              {/* Live Solve Feed Pills */}
              {recentSolves.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {recentSolves.map((s) => (
                    <span
                      key={s.userId}
                      className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold"
                    >
                      #{s.placement} {s.username} (+{s.pointsEarned} · {(s.solveTimeMs / 1000).toFixed(2)}s)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ROUND RESULT BRIEF RECAP */}
          {mathRoom.status === 'IN_PROGRESS' && roundState?.phase === 'ROUND_RESULT' && (
            <div className="w-full max-w-2xl bg-card border border-emerald-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 text-center animate-fadeIn">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Round {roundState.roundNumber} Complete
              </span>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-1">
                <div className="text-lg sm:text-2xl font-mono font-bold text-slate-300">
                  {roundResult?.equationDisplay || roundState.equationDisplay}
                </div>
                <div className="text-3xl sm:text-5xl font-mono font-black text-emerald-400">
                  {roundResult?.correctAnswer ?? '—'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {(roundResult?.standings || sortedPlayers).map((p, idx) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <span className="font-bold text-white truncate">{p.username}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      {p.roundPointsEarned ? (
                        <span className="text-emerald-400 font-bold">+{p.roundPointsEarned}</span>
                      ) : (
                        <span className="text-slate-600">+0</span>
                      )}
                      <span className="text-amber-300 font-black">{p.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs font-mono text-slate-400 animate-pulse">
                {roundState.roundNumber >= roundState.totalRounds
                  ? 'Calculating final podium & rank rewards...'
                  : 'Preparing next round...'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Compact Footer Voice Bar (Available inside matches) */}
      <footer className="shrink-0 bg-surface/90 border-t border-slate-800 px-3 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <OpenMicControlBar compact={true} />
        </div>
      </footer>

      {/* Post-Match Podium Modal */}
      {matchWinner && (
        <PostMatchModal
          winnerId={matchWinner.winnerId}
          standings={matchWinner.standings}
          deltas={matchWinner.deltas}
          mode={mathRoom.mode}
          isHost={isHost}
          onRematch={mathRoom.mode === 'PRIVATE' && isHost ? resetRematch : undefined}
          onClose={leaveRoom}
        />
      )}
    </div>
  );
};
