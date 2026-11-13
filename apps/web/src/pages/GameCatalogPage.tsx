import { GameType } from '@wordchain/shared';
import {
  ArrowRight,
  Calculator,
  Crown,
  Flame,
  Gamepad2,
  Hash,
  KeyRound,
  LogIn,
  ShieldCheck,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { RankEmblem } from '../components/RankEmblem.js';
import { useAuth } from '../context/AuthContext.js';
import { socketService } from '../services/socket.js';

interface GameCatalogPageProps {
  onSelectGame: (game: GameType) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
}

export const GameCatalogPage: React.FC<GameCatalogPageProps> = ({
  onSelectGame,
  onOpenAuth,
  onOpenLeaderboard,
  onOpenProfile,
}) => {
  const { user, loginAsGuest } = useAuth();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);

  const wordRank = user?.gameRanks?.WORDCHAIN || user?.currentRank;
  const mathRank = user?.gameRanks?.MATHRACE || {
    tier: 'NURSERY' as const,
    division: 3,
    rankExp: 0,
    scientistPoints: 0,
    hiddenMmr: 1000,
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomCodeInput.trim().toUpperCase();
    if (cleaned.length < 4) return;
    if (!user) {
      onOpenAuth('login');
      return;
    }
    setJoiningRoom(true);
    socketService.joinRoom(cleaned);
    setTimeout(() => setJoiningRoom(false), 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      {/* Website Hero & Shared Account Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800/90 p-6 sm:p-9 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-accent-primary/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>DJB ARCADE PORTAL · SINGLE ACCOUNT ACCESS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Pick Your Arena. <span className="text-gradient">One Login</span> for Every Game.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Sign in once to carry your Account Level, Lifetime XP, and Cosmetics across all games in DJB Arcade — each title features its own independent Ranked ladder and leaderboards.
            </p>
          </div>

          {/* Account Status Card */}
          <div className="shrink-0 w-full lg:w-80 rounded-2xl bg-slate-950/75 border border-slate-800 p-4 sm:p-5 space-y-3 backdrop-blur-md">
            {user ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                      Website-Wide Account Active
                    </span>
                    <button
                      onClick={onOpenProfile}
                      className="text-lg font-black text-white hover:text-accent-secondary transition-colors text-left"
                    >
                      {user.displayName || user.username}
                    </button>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-accent-primary/15 border border-accent-primary/30 text-accent-secondary font-mono font-black text-xs">
                    LVL {user.profile.accountLevel}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 block">XP</span>
                    <span className="font-mono font-bold text-xs text-slate-200">{user.profile.lifetimeXp}</span>
                  </div>
                  <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 block">Wins</span>
                    <span className="font-mono font-bold text-xs text-amber-400">{user.profile.totalWins}</span>
                  </div>
                  <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 block">Matches</span>
                    <span className="font-mono font-bold text-xs text-cyan-300">{user.profile.totalMatches}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onOpenProfile}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all"
                  >
                    Dossier
                  </button>
                  <button
                    onClick={onOpenLeaderboard}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Ranks
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-bold">
                  <ShieldCheck className="w-4 h-4 text-accent-secondary" />
                  <span>Universal Portal Login</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Register once to unlock Casual, Ranked, and Private rooms across every game with no duplicate signup.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-glow transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Register
                  </button>
                </div>
                <button
                  onClick={() => loginAsGuest().catch(() => {})}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-bold transition-all"
                >
                  Continue as Instant Guest
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Games Catalog Grid */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Games Catalog</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Choose an arena below to enter its Casual, Ranked, Private, or Practice modes.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full self-start sm:self-auto">
            2 Playable Arenas Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: WORDCHAIN */}
          <div className="group relative rounded-3xl bg-card border border-slate-800 hover:border-cyan-500/60 p-6 sm:p-7 transition-all shadow-xl hover:shadow-cyan-950/30 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
                  <Swords className="w-7 h-7" />
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-bold flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" /> 2–4 Players
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 text-[11px] font-mono font-bold">
                    Word Survival
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                  WordChain
                </h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  High-stakes turn-based vocabulary survival. Chain valid words starting with the previous word&apos;s ending letter, deploy 4 tactical skills, and outlast rivals across 4 languages.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">EN / TL / BS / MIXED</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">4 Arena Skills</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">Time Attack</span>
              </div>
            </div>

            <div className="space-y-4 pt-3 border-t border-slate-800/80">
              {user && wordRank && (
                <div className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Your Rank</span>
                  <RankEmblem
                    tier={wordRank.tier}
                    division={wordRank.division}
                    scientistPoints={wordRank.scientistPoints}
                    size="sm"
                  />
                </div>
              )}

              <button
                onClick={() => onSelectGame('WORDCHAIN')}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Enter WordChain Hub</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* CARD 2: MATHBLITZ */}
          <div className="group relative rounded-3xl bg-card border border-slate-800 hover:border-amber-500/60 p-6 sm:p-7 transition-all shadow-xl hover:shadow-amber-950/30 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/25 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
                  <Calculator className="w-7 h-7" />
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-black flex items-center gap-1">
                    <Flame className="w-3 h-3" /> NEW
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-bold flex items-center gap-1">
                    <Users className="w-3 h-3 text-amber-400" /> 2–6 Players
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                  MathBlitz
                </h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  10-round live equation racing! Every round, each player has 3 seconds to pick a random number (1–99). All picks forge one live problem (+, −, ×, or 4-choice ÷) — fastest solves win!
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">10 Rounds</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">3s Number Pick</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">+ − × &amp; 4-Choice ÷</span>
              </div>
            </div>

            <div className="space-y-4 pt-3 border-t border-slate-800/80">
              {user && (
                <div className="flex items-center justify-between bg-slate-950/60 px-3.5 py-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Your Rank</span>
                  <RankEmblem
                    tier={mathRank.tier}
                    division={mathRank.division}
                    scientistPoints={mathRank.scientistPoints}
                    size="sm"
                  />
                </div>
              )}

              <button
                onClick={() => onSelectGame('MATHRACE')}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Enter MathBlitz Hub</span>
                <Zap className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Join Room by Code (Works Across Any Game) */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 sm:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">Have a Private Room Code?</h3>
            <p className="text-xs text-slate-400">
              Enter any WordChain or MathBlitz 6-character code — you&apos;ll automatically route into the host&apos;s game.
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickJoin} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-44">
            <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={8}
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-accent-primary outline-none font-mono font-bold text-sm text-white uppercase tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={roomCodeInput.trim().length < 4 || joiningRoom}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer"
          >
            {joiningRoom ? 'Joining...' : 'Join Room'}
          </button>
        </form>
      </section>

      {/* Footer note */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-500 pt-2">
        <span className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-400" /> Shared Level &amp; Cosmetics across all games
        </span>
        <span>·</span>
        <span>Independent Nursery → Scientist ladders per game</span>
      </div>
    </div>
  );
};
