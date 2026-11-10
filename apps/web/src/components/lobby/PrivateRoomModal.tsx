import { Clock, Globe, KeyRound, PlusCircle, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { GameLanguage } from '@wordchain/shared';
import { useGame } from '../../context/GameContext.js';

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivateRoomModal: React.FC<PrivateRoomModalProps> = ({ isOpen, onClose }) => {
  const { createPrivateRoom, joinRoomByCode, error, clearError } = useGame();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTimer, setSelectedTimer] = useState<number>(15);
  const [selectedLanguage, setSelectedLanguage] = useState<GameLanguage>('ENGLISH');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPrivateRoom(selectedTimer, selectedLanguage);
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    joinRoomByCode(roomCode.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-lg text-white">Private Room</h3>
          </div>
          <button
            onClick={() => {
              clearError();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/30">
          <button
            onClick={() => { setActiveTab('create'); clearError(); }}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-accent-primary text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => { setActiveTab('join'); clearError(); }}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'join'
                ? 'border-accent-primary text-white bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-state-danger/15 border border-state-danger/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-secondary" /> Starting Turn Timer Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Relaxed', sec: 20, desc: '20s timer' },
                    { label: 'Classic', sec: 15, desc: '15s timer' },
                    { label: 'Expert', sec: 10, desc: '10s blitz' },
                  ].map((preset) => (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => setSelectedTimer(preset.sec)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedTimer === preset.sec
                          ? 'border-accent-primary bg-accent-primary/20 text-white shadow-glow'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-100">{preset.label}</div>
                      <div className="text-[11px] font-mono mt-0.5 text-slate-400">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Preset */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-accent-secondary" /> Dictionary Language
                  </span>
                  <span className="text-[11px] text-indigo-300 font-mono font-bold">
                    {selectedLanguage === 'ENGLISH'
                      ? 'English'
                      : selectedLanguage === 'TAGALOG'
                      ? 'Tagalog'
                      : selectedLanguage === 'BISAYA'
                      ? 'Bisaya'
                      : 'Mixed (3 Languages)'}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ENGLISH' as const, label: 'English', icon: '🇬🇧' },
                    { id: 'TAGALOG' as const, label: 'Tagalog', icon: '🇵🇭' },
                    { id: 'BISAYA' as const, label: 'Bisaya', icon: '🇵🇭' },
                    { id: 'MIXED' as const, label: 'Mixed', icon: '🌐' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                        selectedLanguage === lang.id
                          ? 'border-accent-primary bg-accent-primary/20 text-white shadow-glow'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{lang.icon}</span>
                      <span className="font-bold text-xs text-slate-200">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                You will be assigned as Host with a shareable 6-character room code to invite up to 7 friends.
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 font-black shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Private Lobby</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Enter 6-Letter Room Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-center text-lg tracking-widest font-black text-slate-100 uppercase focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={roomCode.trim().length < 3}
                className="w-full py-3 rounded-xl font-bold text-sm bg-accent-primary hover:bg-indigo-500 text-white shadow-glow transition-all disabled:opacity-50"
              >
                Join Lobby
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
