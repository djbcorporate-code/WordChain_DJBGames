import React, { useState } from 'react';
import {
  IMPOSTOR_CATEGORIES,
  IMPOSTOR_CONVERSATION_PRESETS,
  ImpostorCategoryId,
  ImpostorDifficulty,
  ImpostorSettings,
} from '@wordchain/shared';
import { Clock, KeyRound, Play, ShieldAlert, Users, X } from 'lucide-react';
import { useImpostorGame } from '../../context/ImpostorGameContext.js';

interface ImpostorPrivateModalProps {
  isOpen: boolean;
  initialCategory?: ImpostorCategoryId;
  initialDifficulty?: ImpostorDifficulty;
  onClose: () => void;
}

const DIFFICULTY_PILLS: { id: ImpostorDifficulty; label: string }[] = [
  { id: 'ALL', label: 'All Tiers' },
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
  { id: 'EXPERT', label: 'Expert' },
];

export const ImpostorPrivateModal: React.FC<ImpostorPrivateModalProps> = ({
  isOpen,
  initialCategory = 'RANDOM',
  initialDifficulty = 'ALL',
  onClose,
}) => {
  const { createPrivateRoom, joinRoomByCode } = useImpostorGame();
  const [activeTab, setActiveTab] = useState<'HOST' | 'JOIN'>('HOST');
  const [category, setCategory] = useState<ImpostorCategoryId>(initialCategory);
  const [difficulty, setDifficulty] = useState<ImpostorDifficulty>(initialDifficulty);
  const [impostorCount, setImpostorCount] = useState<number>(1);
  const [conversationSec, setConversationSec] = useState<number>(90);
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setDifficulty(initialDifficulty);
    }
  }, [isOpen, initialCategory, initialDifficulty]);

  if (!isOpen) return null;

  const filteredCategories =
    difficulty === 'ALL'
      ? IMPOSTOR_CATEGORIES
      : IMPOSTOR_CATEGORIES.filter((c) => c.difficulty === difficulty);

  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settings: Partial<ImpostorSettings> = {
      category,
      difficulty,
      impostorCount,
      conversationSec,
      blindMode,
    };
    createPrivateRoom(settings);
    onClose();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomCodeInput.trim().toUpperCase();
    if (!cleaned) return;
    joinRoomByCode(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-3xl border border-rose-500/25 bg-[#0b0d14] text-zinc-100 shadow-[0_0_60px_rgba(225,29,72,0.18)] overflow-hidden animate-noir-fade-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Classified Operation Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 border-b border-white/10 bg-black/30 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('HOST')}
            className={`py-3 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === 'HOST'
                ? 'bg-rose-600/15 text-rose-400 border-b-2 border-rose-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Host Private Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('JOIN')}
            className={`py-3 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer ${
              activeTab === 'JOIN'
                ? 'bg-rose-600/15 text-rose-400 border-b-2 border-rose-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Enter Room Code
          </button>
        </div>

        {activeTab === 'HOST' ? (
          <form onSubmit={handleHostSubmit} className="p-6 space-y-5 overflow-y-auto">
            {/* Difficulty Filter */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                Word Pool Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setDifficulty(pill.id);
                      if (
                        pill.id !== 'ALL' &&
                        category !== 'RANDOM' &&
                        IMPOSTOR_CATEGORIES.find((c) => c.id === category)?.difficulty !== pill.id
                      ) {
                        setCategory('RANDOM');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      difficulty === pill.id
                        ? 'border-rose-500 bg-rose-600/20 text-white shadow-sm shadow-rose-500/30'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                Secret Subject Category ({filteredCategories.length} Available · Adjustable Live in Lobby)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setCategory('RANDOM')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    category === 'RANDOM'
                      ? 'border-rose-500 bg-rose-600/20 text-white'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <span>🎲</span>
                  <span className="truncate">Random Pool</span>
                </button>
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === cat.id
                        ? 'border-rose-500 bg-rose-600/20 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Impostors & Conversation Timer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                  <Users className="w-3.5 h-3.5 text-rose-400" />
                  Impostor Count
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setImpostorCount(count)}
                      className={`py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        impostorCount === count
                          ? 'border-rose-500 bg-rose-600/25 text-white'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {count} {count === 1 ? 'Impostor' : 'Impostors'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Conversation Timer
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {IMPOSTOR_CONVERSATION_PRESETS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setConversationSec(sec)}
                      className={`py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        conversationSec === sec
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Blind Role Mode Toggle */}
            <div className="rounded-2xl border border-violet-500/25 bg-violet-950/15 p-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>🕶️ Blind Identity Mode</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      blindMode
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/10 text-zinc-400'
                    }`}
                  >
                    {blindMode ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Players don&apos;t know if they are Crewmate or Impostor — everyone receives an unlabeled word or clue!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlindMode((v) => !v)}
                className={`shrink-0 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  blindMode
                    ? 'border-violet-400 bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                    : 'border-white/15 bg-white/5 text-zinc-300 hover:text-white'
                }`}
              >
                {blindMode ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-black uppercase tracking-[0.2em] text-xs text-white shadow-lg shadow-rose-600/30 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Open Staging Lounge (3–10 Players)
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                6-Character Dossier Room Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-rose-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={8}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="E.g. X7K9P2"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/15 bg-black/50 text-white font-mono text-base font-bold tracking-[0.25em] uppercase placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 font-black uppercase tracking-[0.2em] text-xs text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              Infiltrate Lobby
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
