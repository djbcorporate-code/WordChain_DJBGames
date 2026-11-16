import {
  CHESS_CLOCK_PRESETS_SEC,
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_DEFAULT_INCREMENT_SEC,
  CHESS_INCREMENT_PRESETS_SEC,
  ChessVariant,
} from '@wordchain/shared';
import { Clock, Crown, Hash, KeyRound, PlusCircle, Timer, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { useChessGame } from '../../context/ChessGameContext.js';

interface ChessPrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VARIANT_OPTS: { value: ChessVariant; label: string; desc: string }[] = [
  { value: '2P', label: '2-Player Classic', desc: '8×8 standard board · White vs Black' },
  { value: '3P', label: '3-Player Hex', desc: '96-square hexagonal board · White, Black & Red' },
  { value: '4P', label: '4-Player Cross', desc: '14×14 cross board · Yellow, Blue, Red & Green' },
];

export const ChessPrivateRoomModal: React.FC<ChessPrivateRoomModalProps> = ({ isOpen, onClose }) => {
  const { createPrivateRoom, joinRoom, error } = useChessGame();
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [variant, setVariant] = useState<ChessVariant>('2P');
  const [clockSec, setClockSec] = useState<number>(CHESS_DEFAULT_CLOCK_SEC);
  const [incrementSec, setIncrementSec] = useState<number>(CHESS_DEFAULT_INCREMENT_SEC);
  const [joinCode, setJoinCode] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    createPrivateRoom(variant, clockSec, incrementSec);
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    joinRoom(joinCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors absolute right-5 top-5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Chess Private Room</h2>
            <p className="text-xs text-slate-400">Choose 2P Classic, 3P Hex, or 4P Cross &amp; time control</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'CREATE'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Host Lobby
          </button>
          <button
            onClick={() => setActiveTab('JOIN')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'JOIN'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Join by Code
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {activeTab === 'CREATE' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 font-bold block">
                Board &amp; Player Count
              </label>
              <div className="grid grid-cols-1 gap-2">
                {VARIANT_OPTS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVariant(v.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      variant === v.value
                        ? 'bg-emerald-500/15 border-emerald-400/60 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{v.label}</div>
                    <div className="text-[11px] text-slate-400">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Base Clock</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHESS_CLOCK_PRESETS_SEC.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setClockSec(sec)}
                      className={`py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                        clockSec === sec
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec / 60}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Increment</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHESS_INCREMENT_PRESETS_SEC.map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setIncrementSec(inc)}
                      className={`py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                        incrementSec === inc
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      +{inc}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-sm shadow-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Create {variant} Chess Room</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 font-bold block">
                Enter 6-Character Room Code
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 outline-none font-mono font-bold text-lg text-white tracking-widest uppercase"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joinCode.trim().length < 4}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 disabled:opacity-40 text-slate-950 font-black text-sm shadow-glow transition-all cursor-pointer"
            >
              Join Chess Lobby
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
