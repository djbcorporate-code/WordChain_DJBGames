import { AcademicRankTier } from '@wordchain/shared';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Loader2,
  Medal,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { RankEmblem } from '../RankEmblem.js';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarId: string;
  accountLevel: number;
  tier: AcademicRankTier;
  division: number;
  rankExp: number;
  scientistPoints: number;
  totalMatches: number;
  totalWins: number;
  winRate: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScholar?: (username: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  onSelectScholar,
}) => {
  const [activeTab, setActiveTab] = useState<'SEASONAL' | 'LIFETIME_WINS' | 'ACCOUNT_LEVEL'>('SEASONAL');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [seasonName, setSeasonName] = useState<string>('Season 1 Active');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api.leaderboards
      .get(activeTab, page, 15)
      .then((res) => {
        if (!isMounted) return;
        setEntries(res.entries);
        setTotalPages(res.totalPages);
        if (res.season?.name) {
          setSeasonName(res.season.name);
        }
      })
      .catch((err) => {
        console.error('Failed to load leaderboards:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, page]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col space-y-5 overflow-hidden">
        {/* Glow background */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-glow">
              <Trophy className="w-6 h-6 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">Global Leaderboards</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Flame className="w-3 h-3 animate-pulse" /> {seasonName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Top scholars competing across all 11 Academic Tiers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('SEASONAL');
              setPage(1);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'SEASONAL'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Seasonal Standing</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('LIFETIME_WINS');
              setPage(1);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'LIFETIME_WINS'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Lifetime Wins</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ACCOUNT_LEVEL');
              setPage(1);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ACCOUNT_LEVEL'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Account Level</span>
          </button>
        </div>

        {/* Leaderboard Table Container */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-card/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent-secondary" />
              <span className="text-xs font-mono">Loading global rankings...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <Trophy className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No ranked matches recorded yet this season</p>
              <p className="text-xs text-slate-500">Be the first scholar to ascend the academic ladder!</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Academic Tier</th>
                  <th className="py-3 px-4 text-center">Wins</th>
                  <th className="py-3 px-4 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {entries.map((entry) => {
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;

                  return (
                    <tr
                      key={entry.userId}
                      onClick={() => onSelectScholar?.(entry.username)}
                      className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        isTop1
                          ? 'bg-amber-500/5'
                          : isTop2
                          ? 'bg-slate-300/5'
                          : isTop3
                          ? 'bg-amber-700/5'
                          : ''
                      }`}
                    >
                      {/* Rank badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                            isTop1
                              ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 shadow-glow'
                              : isTop2
                              ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950'
                              : isTop3
                              ? 'bg-gradient-to-tr from-amber-600 to-amber-700 text-white'
                              : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      {/* Scholar Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-accent-secondary">
                            {entry.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                              <span>{entry.username}</span>
                              {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Account Lvl {entry.accountLevel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Academic Tier & Emblem */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <RankEmblem
                            tier={entry.tier}
                            division={entry.division}
                            scientistPoints={entry.scientistPoints}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* Total Wins */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                        {entry.totalWins}
                        <span className="text-[10px] text-slate-500 font-normal">
                          {' '}/ {entry.totalMatches}
                        </span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            entry.winRate >= 60
                              ? 'text-emerald-400'
                              : entry.winRate >= 40
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }
                        >
                          {entry.winRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-1 text-xs font-mono text-slate-400">
          <span>
            Page <strong className="text-slate-200">{page}</strong> of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 transition-all text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 transition-all text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
