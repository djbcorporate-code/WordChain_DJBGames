import React, { useState } from 'react';
import {
  IMPOSTOR_CATEGORIES,
  ImpostorCategoryId,
  ImpostorDifficulty,
  ImpostorDifficultyTier,
} from '@wordchain/shared';
import {
  ArrowLeft,
  Clock,
  Fingerprint,
  KeyRound,
  MessageSquare,
  Mic,
  Play,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { ImpostorPrivateModal } from '../components/lobby/ImpostorPrivateModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useImpostorGame } from '../context/ImpostorGameContext.js';

interface ImpostorDashboardProps {
  onBackToCatalog: () => void;
  onReplayIntro: () => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

const TIER_STYLES: Record<ImpostorDifficultyTier, string> = {
  EASY: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  MEDIUM: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  HARD: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
  EXPERT: 'text-rose-300 bg-rose-500/20 border-rose-500/40',
};

export const ImpostorDashboard: React.FC<ImpostorDashboardProps> = ({
  onBackToCatalog,
  onReplayIntro,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const { joinCasualQueue, queueStatus, lastError, clearError, kickedNotice, dismissKickedNotice } =
    useImpostorGame();

  const [tierFilter, setTierFilter] = useState<ImpostorDifficulty>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<ImpostorCategoryId>('RANDOM');
  const [presetDifficulty, setPresetDifficulty] = useState<ImpostorDifficulty>('ALL');

  const visibleCategories =
    tierFilter === 'ALL'
      ? IMPOSTOR_CATEGORIES
      : IMPOSTOR_CATEGORIES.filter((c) => c.difficulty === tierFilter);

  const openModalWithPreset = (
    catId: ImpostorCategoryId = 'RANDOM',
    diff: ImpostorDifficulty = tierFilter
  ) => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    setPresetCategory(catId);
    setPresetDifficulty(diff);
    setModalOpen(true);
  };

  const handleJoinCasual = () => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    joinCasualQueue();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#06070c] text-zinc-100 relative overflow-hidden">
      {/* Noir Spotlight Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-140px] left-[12%] h-[420px] w-[420px] rounded-full bg-rose-600/15 blur-[130px]" />
        <div className="absolute bottom-[-160px] right-[8%] h-[460px] w-[460px] rounded-full bg-red-900/15 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-noir-fade-up">
        {/* Top Utility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            All Arcade Games
          </button>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-black uppercase tracking-wider text-emerald-300">
              <Users className="w-3.5 h-3.5" />
              3–10 Humans · No AI Bots
            </span>
            <button
              onClick={onReplayIntro}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-black uppercase tracking-wider text-rose-300 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Replay Briefing
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(lastError || kickedNotice) && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 px-5 py-3.5 flex items-center justify-between gap-3 text-sm text-rose-200">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{lastError || kickedNotice}</span>
            </div>
            <button
              onClick={() => {
                clearError();
                dismissKickedNotice();
              }}
              className="text-xs font-bold uppercase tracking-wider text-rose-300 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Split Dossier */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e1019] via-[#090b12] to-[#120911] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-rose-500/15 opacity-60">
            <div
              className="animate-radar-sweep absolute inset-0 rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(244,63,94,0.18) 0deg, transparent 70deg)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-[11px] font-black uppercase tracking-[0.22em] text-rose-400">
                <Fingerprint className="w-3.5 h-3.5" />
                CLASSIFIED PARTY DEDUCTION · UNRANKED
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                WHO IS THE{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-500 to-amber-400">
                  IMPOSTOR?
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Welcome to the Spy Lounge{user ? <>, <strong className="text-white">{user.username}</strong></> : null}.
                No Ranked grind here — just pure social deduction. Crewmates receive a Secret Word
                while random Impostors operate off subtle clues. Talk via live Chat & Open Mic Voice,
                spot the bluffer, and cast your ejection vote!
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-zinc-300 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  18 Categorized Pools + Player Names
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Host Controls Timers & Impostor Count
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Open Mic Voice + Text Chat
                </span>
              </div>
            </div>

            {/* Action Command Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-3.5">
              <button
                onClick={() => openModalWithPreset('RANDOM', tierFilter)}
                className="group rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-600/90 to-red-700/90 hover:from-rose-500 hover:to-red-600 p-5 text-left shadow-xl shadow-rose-900/30 transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-100/80">
                    CUSTOM MISSION BRIEFING
                  </span>
                  <KeyRound className="w-5 h-5 text-white/90 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="text-lg sm:text-xl font-black text-white mt-1">
                  Host Private Room / Join Code
                </div>
                <div className="text-xs text-rose-100/85 mt-1">
                  Configure category, difficulty, 1–3 impostors & discussion timer live.
                </div>
              </button>

              <button
                onClick={handleJoinCasual}
                disabled={Boolean(queueStatus?.inQueue)}
                className="group rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] p-5 text-left transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                    QUICK PUBLIC MATCHMAKING
                  </span>
                  <Play className="w-5 h-5 text-emerald-400 fill-current group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-lg font-black text-white mt-1">
                  {queueStatus?.inQueue
                    ? 'Searching for Human Agents...'
                    : 'Join Casual Public Lobby'}
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  Pairs 3–10 real players in automatic 🕶️ Blind Mode on hidden random categories. Zero AI bots.
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 18-Category Classified Atlas */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Classified Word Pools (18 Categories)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any category card to launch a Private Room pre-loaded with that topic.
              </p>
            </div>

            {/* Tier filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'ALL', label: `All (${IMPOSTOR_CATEGORIES.length})` },
                  { id: 'EASY', label: 'Easy (5)' },
                  { id: 'MEDIUM', label: 'Medium (9)' },
                  { id: 'HARD', label: 'Hard (3)' },
                  { id: 'EXPERT', label: 'Expert (1)' },
                ] as { id: ImpostorDifficulty; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTierFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    tierFilter === tab.id
                      ? 'border-rose-500 bg-rose-600/20 text-white'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openModalWithPreset(cat.id, cat.difficulty)}
                className="group rounded-2xl border border-white/10 bg-[#0b0e17]/90 hover:border-rose-500/45 hover:bg-[#111421] p-4 text-left transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white group-hover:text-rose-300 transition-colors truncate">
                        {cat.label}
                      </div>
                      {cat.isDynamic && (
                        <span className="inline-block text-[9px] font-black uppercase tracking-widest text-cyan-300 mt-0.5">
                          Live Lobby Players
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${TIER_STYLES[cat.difficulty]}`}
                  >
                    {cat.difficulty}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <ImpostorPrivateModal
        isOpen={modalOpen}
        initialCategory={presetCategory}
        initialDifficulty={presetDifficulty}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
