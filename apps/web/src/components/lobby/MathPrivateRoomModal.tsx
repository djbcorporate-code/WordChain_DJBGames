import { MathOperationMode } from '@wordchain/shared';
import { Calculator, Hash, KeyRound, PlusCircle, Timer, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { useMathGame } from '../../context/MathGameContext.js';

interface MathPrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OP_MODES: { value: MathOperationMode; label: string; desc: string }[] = [
  { value: 'MIXED', label: 'Balanced Mix (+ − × ÷)', desc: 'All 4 operations rotated across 10 rounds' },
  { value: 'ADD', label: 'Addition (+)', desc: 'Pure rapid sum chains' },
  { value: 'SUBTRACT', label: 'Subtraction (−)', desc: 'Left-to-right differences (negatives allowed)' },
  { value: 'MULTIPLY', label: 'Multiplication (×)', desc: 'Product speed sprints' },
  { value: 'DIVIDE', label: 'Division (÷ Choices)', desc: '4-choice decimal quotients · 1 shot per round' },
];

export const MathPrivateRoomModal: React.FC<MathPrivateRoomModalProps> = ({ isOpen, onClose }) => {
  const { createPrivateRoom, joinRoom, error } = useMathGame();
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [operationMode, setOperationMode] = useState<MathOperationMode>('MIXED');
  const [raceTimerSec, setRaceTimerSec] = useState<number>(60);
  const [joinCode, setJoinCode] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    createPrivateRoom(operationMode, raceTimerSec);
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
      <div className="relative w-full max-w-lg bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors absolute right-5 top-5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">MathBlitz Private Room</h2>
            <p className="text-xs text-slate-400">Host 2–6 players · Custom operation &amp; race timer</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'CREATE'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Host Lobby
          </button>
          <button
            onClick={() => setActiveTab('JOIN')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'JOIN'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md'
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
                Operation Focus
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                {OP_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setOperationMode(m.value)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      operationMode === m.value
                        ? 'bg-amber-500/15 border-amber-400/60 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm">{m.label}</div>
                      <div className="text-[11px] text-slate-400">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                <span>Solve Window per Round ({raceTimerSec}s)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setRaceTimerSec(sec)}
                    className={`py-2 rounded-xl border font-mono text-xs font-bold transition-all ${
                      raceTimerSec === sec
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm shadow-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Create 2–6 Player Room</span>
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 outline-none font-mono font-bold text-lg text-white tracking-widest uppercase"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joinCode.trim().length < 4}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 disabled:opacity-40 text-slate-950 font-black text-sm shadow-glow transition-all cursor-pointer"
            >
              Join Lobby
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
