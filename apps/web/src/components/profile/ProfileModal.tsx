import {
  AcademicRankTier,
  COSMETIC_AVATARS,
  RANK_TIER_CONFIGS,
} from '@wordchain/shared';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Compass,
  Crown,
  GraduationCap,
  History,
  Lock,
  Scroll,
  Shield,
  Sparkles,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { RankEmblem } from '../RankEmblem.js';

interface ProfileModalProps {
  isOpen: boolean;
  username?: string; // If undefined, displays logged-in user
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  username,
  onClose,
}) => {
  const { user: currentUser, refreshUser } = useAuth();
  const targetUsername = username || currentUser?.username || '';
  const isSelf = currentUser && currentUser.username.toLowerCase() === targetUsername.toLowerCase();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOCKER' | 'HISTORY'>('OVERVIEW');
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [equippingAvatarId, setEquippingAvatarId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !targetUsername) return;

    let isMounted = true;
    setLoading(true);
    setFeedbackMsg(null);

    api.profile
      .get(targetUsername)
      .then((res) => {
        if (!isMounted) return;
        setProfileData(res.profile);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUsername]);

  const handleEquipAvatar = async (avatarId: string) => {
    try {
      setEquippingAvatarId(avatarId);
      await api.profile.updateAvatar(avatarId);
      await refreshUser();
      setFeedbackMsg('Cosmetic avatar equipped successfully!');
      if (profileData) {
        setProfileData({ ...profileData, avatarId });
      }
    } catch (err: any) {
      setFeedbackMsg(err.message);
    } finally {
      setEquippingAvatarId(null);
    }
  };

  if (!isOpen) return null;

  const currentTierConfig = profileData
    ? RANK_TIER_CONFIGS[profileData.currentRank.tier as AcademicRankTier]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col space-y-5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center text-slate-950 shadow-glow font-black text-lg">
              {targetUsername.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{targetUsername}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-accent-secondary border border-slate-700">
                  Lvl {profileData?.accountLevel || 1}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Lifetime XP: {profileData?.lifetimeXp?.toLocaleString() || 0} XP
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
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Career Overview</span>
          </button>

          {isSelf && (
            <button
              onClick={() => setActiveTab('LOCKER')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'LOCKER'
                  ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Cosmetics Locker</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Match History</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center animate-fadeIn">
            {feedbackMsg}
          </div>
        )}

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-mono text-xs">
              Loading scholar dossier...
            </div>
          ) : !profileData ? (
            <div className="py-20 text-center text-slate-400">Scholar profile not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Current Academic Standing Card */}
                  <div className="bg-card border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <RankEmblem
                        tier={profileData.currentRank.tier}
                        division={profileData.currentRank.division}
                        scientistPoints={profileData.currentRank.scientistPoints}
                        size="md"
                      />
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                        Highest Standing
                      </span>
                      <span className="text-sm font-bold text-accent-secondary">
                        {profileData.highestRank.highestTier}
                        {profileData.highestRank.highestScientistPoints > 0 &&
                          ` (${profileData.highestRank.highestScientistPoints} SP)`}
                      </span>
                    </div>
                  </div>

                  {/* Career Stats 2x3 Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                        Matches Played
                      </span>
                      <p className="text-xl font-black text-white font-mono">
                        {profileData.totalMatches}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                        Total Victories
                      </span>
                      <p className="text-xl font-black text-amber-400 font-mono">
                        {profileData.totalWins}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                        Win Rate
                      </span>
                      <p className="text-xl font-black text-emerald-400 font-mono">
                        {profileData.winRate}%
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                        Words Submitted
                      </span>
                      <p className="text-xl font-black text-indigo-400 font-mono">
                        {profileData.totalWordsPlayed}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-1 sm:col-span-2">
                      <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                        Longest Word Played
                      </span>
                      <p className="text-lg font-black text-slate-200 font-mono tracking-wider">
                        {profileData.longestWord || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COSMETICS LOCKER */}
              {activeTab === 'LOCKER' && isSelf && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COSMETIC_AVATARS.map((avatar) => {
                      const isUnlocked = profileData.accountLevel >= avatar.requiredAccountLevel;
                      const isEquipped = profileData.avatarId === avatar.id;

                      return (
                        <div
                          key={avatar.id}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isEquipped
                              ? 'bg-accent-primary/10 border-accent-primary shadow-glow'
                              : isUnlocked
                              ? 'bg-card border-slate-800 hover:border-slate-700'
                              : 'bg-slate-950/40 border-slate-850 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isEquipped
                                  ? 'bg-accent-primary text-white shadow-md'
                                  : isUnlocked
                                  ? 'bg-slate-800 text-accent-secondary'
                                  : 'bg-slate-900 text-slate-500'
                              }`}
                            >
                              {avatar.id === 'avatar_default_01' && <GraduationCap className="w-5 h-5" />}
                              {avatar.id === 'avatar_scholar_05' && <Award className="w-5 h-5" />}
                              {avatar.id === 'avatar_honor_10' && <BookOpen className="w-5 h-5" />}
                              {avatar.id === 'avatar_master_20' && <Scroll className="w-5 h-5" />}
                              {avatar.id === 'avatar_legend_30' && <Compass className="w-5 h-5" />}
                              {avatar.id === 'avatar_quantum_50' && <Zap className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="font-bold text-sm text-white">{avatar.name}</div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {avatar.title}
                              </span>
                            </div>
                          </div>

                          <div>
                            {isEquipped ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-primary text-white shadow-md">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            ) : isUnlocked ? (
                              <button
                                onClick={() => handleEquipAvatar(avatar.id)}
                                disabled={equippingAvatarId === avatar.id}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-accent-primary text-slate-200 hover:text-white transition-all"
                              >
                                Equip
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                                <Lock className="w-3 h-3" /> Lvl {avatar.requiredAccountLevel}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: MATCH HISTORY */}
              {activeTab === 'HISTORY' && (
                <div className="space-y-2">
                  {profileData.matchHistory.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs font-mono">
                      No completed matches recorded yet.
                    </div>
                  ) : (
                    profileData.matchHistory.map((m: any, idx: number) => {
                      const isVictory = m.placement === 1;

                      return (
                        <div
                          key={m.matchId || idx}
                          className="bg-card border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                                isVictory
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              #{m.placement || '—'}
                            </span>

                            <div>
                              <div className="flex items-center gap-2 font-bold text-white">
                                <span>{m.gameMode}</span>
                                {isVictory && <Crown className="w-3 h-3 text-amber-400 fill-current" />}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {m.wordsSubmitted} words submitted
                              </span>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            {m.rankExpChange !== 0 && (
                              <span
                                className={`font-bold block ${
                                  m.rankExpChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {m.rankExpChange > 0 ? `+${m.rankExpChange}` : m.rankExpChange} EXP
                              </span>
                            )}
                            {m.scientistPointsChange !== 0 && (
                              <span
                                className={`font-bold block ${
                                  m.scientistPointsChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {m.scientistPointsChange > 0
                                  ? `+${m.scientistPointsChange}`
                                  : m.scientistPointsChange}{' '}
                                SP
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">
                              +{m.accountXpEarned} XP
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
