import { RANK_TIER_CONFIGS } from '@wordchain/shared';
import { ArrowRight, Flame, Gamepad2, Lock, Shield, Sparkles, Swords, Trophy, Users, Zap } from 'lucide-react';
import React from 'react';
import { RankEmblem } from '../components/RankEmblem.js';
import { useAuth } from '../context/AuthContext.js';
import { useGame } from '../context/GameContext.js';

interface DashboardProps {
  onOpenAuth: (initialTab: 'login' | 'register' | 'verify') => void;
  onStartPractice: () => void;
  onOpenPrivateRoom: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenAuth, onStartPractice, onOpenPrivateRoom }) => {
  const { user, loginAsGuest } = useAuth();
  const { joinQueue } = useGame();

  const rankTierConfig = user ? RANK_TIER_CONFIGS[user.currentRank.tier] : null;
  const casualMatchesPlayed = user?.profile.totalMatches ?? 0;
  const isRankedUnlocked = casualMatchesPlayed >= 5;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero Welcome & Academic Status */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-surface via-slate-900 to-surface border border-slate-800 p-4 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-accent-primary/15 text-indigo-300 border border-accent-primary/30">
                <Flame className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent-secondary animate-pulse" /> Season 1 Active
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-mono">Asia/Manila (UTC+8)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {user ? (
                <>
                  Welcome back, <span className="text-accent-secondary">{user.username}</span>
                </>
              ) : (
                <>Master the Word Chain Arena</>
              )}
            </h1>

            <p className="text-xs sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Ascend through 11 Academic Ranks from <strong className="text-sky-300">Nursery</strong> to the pinnacle{' '}
              <strong className="text-emerald-300">Scientist</strong>. Chain English words under accelerating turn clocks.
            </p>

            {/* Quick Practice Mode Action */}
            <div className="pt-1 sm:pt-2">
              <button
                onClick={onStartPractice}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 font-black text-xs sm:text-sm shadow-glow hover:scale-105 active:scale-95 transition-all"
              >
                <Gamepad2 className="w-4 h-4 text-slate-950" />
                <span>Launch Live Practice Arena</span>
              </button>
            </div>
          </div>

          {/* Academic Rank Card */}
          {user ? (
            <div className="w-full lg:w-80 bg-slate-950/70 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-glow space-y-2.5 sm:space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Current Standing</span>
                <span className="text-[11px] sm:text-xs font-mono font-semibold text-accent-secondary">
                  MMR: {user.currentRank.hiddenMmr}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <RankEmblem
                  tier={user.currentRank.tier}
                  division={user.currentRank.division}
                  scientistPoints={user.currentRank.scientistPoints}
                  size="md"
                />
              </div>

              {/* Progress bar to next division */}
              {user.currentRank.tier !== 'SCIENTIST' && rankTierConfig && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Rank EXP</span>
                    <span className="text-slate-200 font-bold">
                      {user.currentRank.rankExp} / {rankTierConfig.expPerDivision} EXP
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (user.currentRank.rankExp / rankTierConfig.expPerDivision) * 100)}%`,
                      }}
                    />
                  </div>
                  {rankTierConfig.demotionProtected && (
                    <div className="flex items-center gap-1 text-[11px] text-sky-400 font-medium">
                      <Shield className="w-3 h-3" /> Demotion Protected Tier
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                onClick={loginAsGuest}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-cyan-300 border border-cyan-500/40 shadow-md hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Play as Guest</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-secondary font-bold text-white shadow-glow hover:scale-105 active:scale-95 transition-all text-sm"
              >
                Sign Up to Compete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Multiplayer Game Mode Hub */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-secondary" /> Multiplayer Game Modes
          </h2>
          <span className="text-xs font-mono text-slate-400">Authoritative Server • Real-Time Sockets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode 1: Casual Multiplayer */}
          <div className="relative group rounded-2xl bg-card border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 hover:bg-cardHover transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Casual Arena</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">2–4 Players</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Automatic casual matchmaking. Perfect for practice and earning permanent Account Level XP without rank pressure.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" /> Awards Account XP
                </div>
                <div>Timer: 15s → 8s Dynamic</div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) onOpenAuth('login');
                else joinQueue('CASUAL');
              }}
              className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-slate-800 group-hover:bg-accent-primary text-slate-100 group-hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? 'Enter Casual Arena' : 'Sign In to Play'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mode 2: Ranked Multiplayer */}
          <div
            className={`relative group rounded-2xl bg-card border p-6 flex flex-col justify-between transition-all ${
              isRankedUnlocked
                ? 'border-accent-primary/40 hover:border-accent-primary bg-gradient-to-b from-card to-indigo-950/20'
                : 'border-slate-800 opacity-90'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-accent-secondary">
                <Swords className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Competitive Ranked</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/30 text-indigo-300 font-bold">
                    4-Player FFA
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Battle for Rank EXP and climb from Nursery to Scientist. Strict authoritative turn timers and anti-cheat telemetry.
                </p>
              </div>

              {/* Requirements & Unlock Status */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Casual Matches:</span>
                  <span className={casualMatchesPlayed >= 5 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {casualMatchesPlayed} / 5 Played
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) onOpenAuth('login');
                else if (!isRankedUnlocked) alert('Please complete at least 5 Casual Matches before unlocking Ranked Mode!');
                else joinQueue('RANKED');
              }}
              className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isRankedUnlocked
                  ? 'bg-accent-primary hover:bg-indigo-500 text-white shadow-glow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {!isRankedUnlocked && <Lock className="w-4 h-4 text-slate-400" />}
              <span>{user ? (isRankedUnlocked ? 'Queue for Ranked (4-FFA)' : 'Ranked Locked') : 'Sign In to Unlock'}</span>
            </button>
          </div>

          {/* Mode 3: Private Custom Room */}
          <div className="relative group rounded-2xl bg-card border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 hover:bg-cardHover transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Private Room</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">2–8 Players</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Generate a 6-letter room code or join friends with custom difficulty settings (Relaxed, Classic, or Expert).
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div>Host Controls & Kick Ability</div>
                <div>Customizable Turn Timer (5s–30s)</div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) onOpenAuth('login');
                else onOpenPrivateRoom();
              }}
              className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-slate-800 group-hover:bg-amber-600 text-slate-100 group-hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? 'Create / Join Room' : 'Sign In to Play'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
