import {
  CHESS_CLOCK_PRESETS_SEC,
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_VARIANT_LABELS,
  ChessVariant,
  RANK_TIER_CONFIGS,
} from '@wordchain/shared';
import {
  Bot,
  Clock,
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
import { useChessGame } from '../context/ChessGameContext.js';

interface ChessDashboardProps {
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenPrivateModal: () => void;
  onOpenPractice: () => void;
}

const VARIANT_CARDS: { value: ChessVariant; short: string; players: string; desc: string }[] = [
  { value: '2P', short: '2P Classic', players: '8×8 Board', desc: 'White vs Black' },
  { value: '3P', short: '3P Hex', players: '96-Cell Hexagon', desc: 'White · Black · Red' },
  { value: '4P', short: '4P Cross', players: '14×14 Cross', desc: 'Yellow · Blue · Red · Green' },
];

export const ChessDashboard: React.FC<ChessDashboardProps> = ({
  onOpenAuth,
  onOpenPrivateModal,
  onOpenPractice,
}) => {
  const { user, loginAsGuest } = useAuth();
  const { joinQueue } = useChessGame();
  const [casualVariant, setCasualVariant] = useState<ChessVariant>('2P');
  const [casualClockSec, setCasualClockSec] = useState<number>(CHESS_DEFAULT_CLOCK_SEC);
  const [rankedVariant, setRankedVariant] = useState<ChessVariant>('2P');

  const chessRank = user?.gameRanks?.CHESS || {
    tier: 'NURSERY' as const,
    division: 3,
    rankExp: 0,
    scientistPoints: 0,
    hiddenMmr: 1000,
  };

  const tierCfg = RANK_TIER_CONFIGS[chessRank.tier];
  const matchesPlayed = user?.profile?.totalMatches || 0;
  const rankedMatchesNeeded = Math.max(0, 3 - matchesPlayed);
  const isRankedUnlocked = !!user?.emailVerified && rankedMatchesNeeded === 0;

  const handlePlayCasual = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    joinQueue('CASUAL', casualVariant, casualClockSec);
  };

  const handlePlayRanked = () => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    joinQueue('RANKED', rankedVariant, CHESS_DEFAULT_CLOCK_SEC);
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/35 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>SOVEREIGN CHESS · 2, 3 &amp; 4 PLAYER ARENAS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Classic <span className="text-emerald-400">8×8</span>,{' '}
              <span className="text-cyan-400">3P Hex</span> &amp;{' '}
              <span className="text-amber-400">4P Cross</span> Strategy.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Play classic 1v1 Chess or battle 2 to 3 opponents at once on geometric 3-Player Hexagonal and 14×14 Four-Player Cross boards. Checkmated kingdoms vanish in Last King Standing until one sovereign remains!
            </p>

            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">2P · 3P Hex · 4P Cross</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">Last King Standing</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">Live Chess Clocks</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">Castling &amp; En Passant</span>
            </div>
          </div>

          {/* Chess Standing Card */}
          <div className="shrink-0 w-full lg:w-72 rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
            {user ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-400 font-bold">
                  <span>Sovereign Chess Rank</span>
                  <span className="text-emerald-400">LVL {user.profile.accountLevel}</span>
                </div>
                <RankEmblem
                  tier={chessRank.tier}
                  division={chessRank.division}
                  scientistPoints={chessRank.scientistPoints}
                  size="md"
                />
                {tierCfg && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{chessRank.tier === 'SCIENTIST' ? 'Scientist Points' : 'Rank EXP'}</span>
                      <span className="text-slate-200 font-bold">
                        {chessRank.tier === 'SCIENTIST'
                          ? `${chessRank.scientistPoints} SP`
                          : `${chessRank.rankExp} / ${tierCfg.expPerDivision || 100}`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full transition-all"
                        style={{
                          width: `${
                            chessRank.tier === 'SCIENTIST'
                              ? 100
                              : Math.min(100, Math.round((chessRank.rankExp / (tierCfg.expPerDivision || 100)) * 100))
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2.5">
                <span className="text-xs font-mono font-bold text-emerald-300 block">
                  Website Account Required to Play
                </span>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer"
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
        <div className="bg-card border border-slate-800 hover:border-emerald-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Zap className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                2P · 3P · 4P · Bot Fill
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Casual Matchmaking</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Pick your board size and clock control. Automatically backfills with Chess AI bots if solo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Board &amp; Player Count
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VARIANT_CARDS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setCasualVariant(v.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      casualVariant === v.value
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{v.short}</div>
                    <div className="text-[10px] font-mono opacity-80">{v.players}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chess Clock per Player</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHESS_CLOCK_PRESETS_SEC.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCasualClockSec(sec)}
                    className={`py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                      casualClockSec === sec
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec / 60} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handlePlayCasual}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-glow transition-all cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Find Casual {CHESS_VARIANT_LABELS[casualVariant].split(' ')[0]} Match</span>
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
                Competitive Ladder · 5 min + 3s
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Ranked Arena</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Compete in Ranked across 2P Classic, 3P Hex, or 4P Cross to climb the Sovereign Chess ladder from Nursery to Scientist.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Ranked Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VARIANT_CARDS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setRankedVariant(v.value)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      rankedVariant === v.value
                        ? 'bg-rose-500/15 border-rose-400 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{v.short}</div>
                    <div className="text-[10px] font-mono opacity-80">{v.players}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start gap-2">
              {isRankedUnlocked ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-emerald-300 font-semibold">
                    Ranked Eligible! Your Chess Rank standings update automatically every match.
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    {!user?.emailVerified ? 'Verify your email in Profile/Auth modal ' : ''}
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
            <span>{user && !isRankedUnlocked ? 'Ranked Locked' : `Enter Ranked ${rankedVariant} Queue`}</span>
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
              <h2 className="text-xl font-black text-white">Private Room (2, 3, or 4 Players)</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Create a custom room code for friends on 2P Classic, 3P Hex, or 4P Cross with configurable clock &amp; increment, AI bot fill, live chat, and Open Mic voice!
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
        <div className="bg-card border border-slate-800 hover:border-amber-400/50 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-lg transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Dumbbell className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                Offline Training
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Practice Simulator (vs AI Bots)</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Explore 3-Player Hex diagonal forks and 4-Player Cross tactics offline against AI opponents at any board size.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPractice}
            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Launch Chess Practice Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
