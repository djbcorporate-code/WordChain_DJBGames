import { AlertCircle, CheckCircle2, LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { RankEmblem } from './RankEmblem.js';

interface NavbarProps {
  onOpenAuth: (initialTab: 'login' | 'register' | 'verify') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-surface/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center font-black text-xl text-white shadow-glow">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Word<span className="text-accent-secondary">Chain</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-primary/20 text-indigo-300 border border-accent-primary/30 uppercase tracking-wider">
                S1 Academic
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Multiplayer Word Arena</p>
          </div>
        </div>

        {/* User HUD / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Email Verification Banner Pill */}
              {!user.emailVerified ? (
                <button
                  onClick={() => onOpenAuth('verify')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-state-warning/15 border border-state-warning/30 text-amber-300 text-xs font-semibold hover:bg-state-warning/25 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden md:inline">Verify Email to Unlock Ranked</span>
                  <span className="md:hidden">Verify</span>
                </button>
              ) : (
                <span className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Verified Scholar
                </span>
              )}

              {/* Account Level */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-accent-secondary" />
                <span>Lv. {user.profile.accountLevel}</span>
              </div>

              {/* Rank Pill */}
              <div className="bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-xl">
                <RankEmblem
                  tier={user.currentRank.tier}
                  division={user.currentRank.division}
                  scientistPoints={user.currentRank.scientistPoints}
                  size="sm"
                />
              </div>

              {/* User menu / Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="hidden md:inline">{user.username}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-500/30 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-accent-primary hover:bg-indigo-500 text-white shadow-glow transition-all active:scale-95"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
