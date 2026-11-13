import { MathOperationMode, RANK_TIER_CONFIGS } from '@wordchain/shared';
import {
  Bot,
  Calculator,
  Crown,
  Dumbbell,
  Flame,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { RankEmblem } from '../components/RankEmblem.js';
import { useAuth } from '../context/AuthContext.js';
import { useMathGame } from '../context/MathGameContext.js';

interface MathDashboardProps {
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenPrivateModal: () => void;
  onOpenPractice: () => void;
}

const CASUAL_OP_OPTIONS: { value: MathOperationMode; label: string }[] = [
  { value: 'MIXED', label: 'Balanced Mix (+ − × ÷)' },
  { value: 'ADD', label: 'Addition (+)' },
  { value: 'SUBTRACT', label: 'Subtraction (−)' },
  { value: 'MULTIPLY', label: 'Multiplication (×)' },
  { value: 'DIVIDE', label: 'Division (÷ 4-Choice)' },
];

export const MathDashboard: React.FC<MathDashboardProps> = ({
  onOpenAuth,
  onOpenPrivateModal,
  onOpenPractice,
}) => {
  const { user, loginAsGuest } = useAuth();
  const { joinQueue } = useMathGame();
  const [casualOpMode, setCasualOpMode] = useState<MathOperationMode>('MIXED');

  const mathRank = user?.gameRanks?.MATHRACE || {
    tier: 'NURSERY' as const,
    division: 3,
    rankExp: 0,
    scientistPoints: 0,
    hiddenMmr: 1000,
  };

  const tierCfg = RANK_TIER_CONFIGS[mathRank.tier];
  const matchesPlayed = user?.profile?.totalMatches || 0;
  const rankedMatchesNeeded = Math.max(0, 3 - matchesPlayed);
  const isRankedUnlocked = !!user?.emailVerified && rankedMatchesNeeded === 0;

  const handlePlayCasual = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    joinQueue('CASUAL', casualOpMode);
  };

  const handlePlayRanked = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    joinQueue('RANKED', 'MIXED');
  };

  const handlePrivate = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    onOpenPrivateModal();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/35 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold">
              <Calculator className="w-3.5 h-3.5" />
              <span>MATHBLITZ · 2–6 PLAYER SPEED ARITHMETIC</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Pick Your Number in <span className="text-amber-400">3 Seconds</span>. Solve First to{' '}
              <span className="text-orange-400">Rule 10 Rounds</span>.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every player selects a hidden random number (1–99). After 3 seconds, all numbers reveal into one shared equation (+, −, ×, or 4-choice ÷). Speed placement points determine the champion!
            </p>

            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">10 Rounds</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">3s Number Pick</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">15s Solve Race</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
                ÷ Has 4 Choices (No Typing)
              </span>
            </div>
          </div>

          {/* MathBlitz Standing Card */}
          <div className="shrink-0 w-full lg:w-72 rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
            {user ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400 font-bold">
                  <span>MathBlitz Rank</span>
                  <span className="text-amber-400">LVL {user.profile.accountLevel}</span>
                </div>
                <RankEmblem
                  tier={mathRank.tier}
                  division={mathRank.division}
                  scientistPoints={mathRank.scientistPoints}
                  size="md"
                />
                {tierCfg && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{mathRank.tier === 'SCIENTIST' ? 'Scientist Points' : 'Rank EXP'}</span>
                      <span className="text-slate-200 font-bold">
                        {mathRank.tier === 'SCIENTIST'
                          ? `${mathRank.scientistPoints} SP`
                          : `${mathRank.rankExp} / ${tierCfg.expPerDivision || 100}`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                        style={{
                          width: `${
                            mathRank.tier === 'SCIENTIST'
                              ? 100
                              : Math.min(100, Math.round((mathRank.rankExp / (tierCfg.expPerDivision || 100)) * 100))
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2.5">
                <span className="text-xs font-mono font-bold text-amber-300 block">
                  Website Account Required to Race
                </span>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Sign In / Register
                </button>
                <button
                  onClick={() => loginAsGuest().catch(() => {})}
                  className="w-full py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:border-slate-500 cursor-pointer"
                >
                  Guest Pass
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CASUAL ARENA */}
        <div className="bg-card border border-slate-800 hover:border-amber-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Zap className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                2–6 Players · Bot Fill
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Casual Matchmaking</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Fast 10-round public lobbies with XP rewards. Practice every operation with zero rank risk.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Operation Focus
              </label>
              <select
                value={casualOpMode}
                onChange={(e) => setCasualOpMode(e.target.value as MathOperationMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-100 outline-none focus:border-amber-400"
              >
                {CASUAL_OP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handlePlayCasual}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-glow transition-all cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Find Casual Match</span>
          </button>
        </div>

        {/* RANKED ARENA */}
        <div className="bg-card border border-slate-800 hover:border-rose-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-300">
                <Crown className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                Competitive Ladder
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Ranked Arena (Mixed Ops)</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                MMR-matched 10-round showdown cycling Addition, Subtraction, Multiplication &amp; Division. Climb from Nursery to Scientist!
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-2">
              {isRankedUnlocked ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-300 font-semibold">
                    Ranked Eligible! Your MathBlitz Rank standings update automatically every match.
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    {!user?.emailVerified
                      ? 'Verify your email in Profile/Auth modal '
                      : ''}
                    {rankedMatchesNeeded > 0
                      ? `Complete ${rankedMatchesNeeded} Casual match${rankedMatchesNeeded > 1 ? 'es' : ''} to unlock Ranked.`
                      : 'Sign in with a verified account to play Ranked.'}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handlePlayRanked}
            disabled={!!user && !isRankedUnlocked}
            className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              !user || isRankedUnlocked
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white shadow-lg cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {user && !isRankedUnlocked ? <Lock className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
            <span>{user && !isRankedUnlocked ? 'Ranked Locked' : 'Enter Ranked Queue'}</span>
          </button>
        </div>

        {/* PRIVATE ROOM */}
        <div className="bg-card border border-slate-800 hover:border-indigo-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <KeyRound className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Host Kick · Voice · Chat
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Private Room (2–6 Players)</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Create a custom code room for friends with selectable operations (+, −, ×, ÷, or Mix), AI bot fill, live chat &amp; Open Mic voice!
              </p>
            </div>
          </div>

          <button
            onClick={handlePrivate}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Host or Join Private Room</span>
          </button>
        </div>

        {/* SOLO PRACTICE */}
        <div className="bg-card border border-slate-800 hover:border-emerald-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Dumbbell className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                Offline Training
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Practice Simulator (vs AI Bots)</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Hone your 3s number picks and calculation speed against 2 AI opponents across all 4 operations with zero pressure.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPractice}
            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Launch Practice Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
