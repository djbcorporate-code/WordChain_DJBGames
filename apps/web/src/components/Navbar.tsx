import { GameType } from '@wordchain/shared';
import { CheckCircle2, Gamepad2, LayoutGrid, LogOut, ShieldAlert, Trophy, User as UserIcon, Zap } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { RankEmblem } from './RankEmblem.js';

interface NavbarProps {
  onOpenAuth: (initialTab: 'login' | 'register' | 'verify') => void;
  onOpenLeaderboard?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
  activeGame?: 'CATALOG' | GameType;
  onReturnToCatalog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenAdmin,
  activeGame = 'CATALOG',
  onReturnToCatalog,
}) => {
  const { user, logout, loginAsGuest } = useAuth();

  const activeRank =
    activeGame === 'MATHRACE'
      ? user?.gameRanks?.MATHRACE || { tier: 'NURSERY' as const, division: 3, scientistPoints: 0 }
      : user?.gameRanks?.WORDCHAIN || user?.currentRank;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-surface/90 backdrop-blur-md shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <button
          type="button"
          onClick={onReturnToCatalog}
          className="flex items-center gap-2 sm:gap-3 shrink-0 text-left group cursor-pointer"
          title="Back to DJB Arcade Catalog"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center font-black text-base sm:text-xl text-white shadow-glow shrink-0 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-white whitespace-nowrap">
                DJB<span className="text-accent-secondary">Arcade</span>
              </span>
              {activeGame !== 'CATALOG' && (
                <span
                  className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${
                    activeGame === 'MATHRACE'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                  }`}
                >
                  {activeGame === 'MATHRACE' ? 'MathBlitz' : 'WordChain'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block whitespace-nowrap">
              {activeGame === 'MATHRACE'
                ? 'Speed Arithmetic Race'
                : activeGame === 'WORDCHAIN'
                ? 'Multiplayer Word Arena'
                : 'Multi-Game Competitive Portal'}
            </p>
          </div>
        </button>

        {/* Center / Quick Nav */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeGame !== 'CATALOG' && onReturnToCatalog && (
            <button
              onClick={onReturnToCatalog}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 transition-all shadow-sm cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-accent-secondary" />
              <span className="hidden sm:inline">All Games</span>
            </button>
          )}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Leaderboards</span>
          </button>
        </div>

        {/* User HUD / Auth Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <span className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Verified Scholar
              </span>

              {/* Admin Console Trigger */}
              {user.role === 'ADMIN' && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] sm:text-xs font-bold hover:bg-rose-500/25 transition-all shadow-glow"
                  title="Open Admin Operations Console"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}

              {/* Account Level & Profile trigger */}
              <button
                onClick={onOpenProfile}
                className="hidden sm:flex items-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-accent-primary/60 text-xs font-mono font-bold text-slate-200 transition-all"
                title="View Career Dossier & Cosmetics"
              >
                <span>Lv. {user.profile.accountLevel}</span>
              </button>

              {/* Rank Pill */}
              {activeRank && (
                <div
                  onClick={onOpenProfile}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 px-2 sm:px-3 py-1 rounded-xl cursor-pointer transition-all"
                  title="View Rank Standing"
                >
                  <RankEmblem
                    tier={activeRank.tier}
                    division={activeRank.division}
                    scientistPoints={activeRank.scientistPoints}
                    size="sm"
                  />
                </div>
              )}

              {/* User menu / Logout */}
              <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-800">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                  <span className="hidden md:inline">{user.displayName || user.username}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-500/30 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={loginAsGuest}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="Play instantly without signing up"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">Guest</span>
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-accent-primary hover:bg-indigo-500 text-white shadow-glow transition-all active:scale-95"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
