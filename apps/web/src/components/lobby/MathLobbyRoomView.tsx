import { MathOperationMode } from '@wordchain/shared';
import {
  Bot,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  LogOut,
  Play,
  ShieldAlert,
  UserX,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useMathGame } from '../../context/MathGameContext.js';
import { useVoiceChat } from '../../context/VoiceChatContext.js';
import { RankEmblem } from '../RankEmblem.js';
import { OpenMicControlBar } from '../voice/OpenMicControlBar.js';
import { LobbyChatBox } from './LobbyChatBox.js';

const OP_LABELS: Record<MathOperationMode, string> = {
  MIXED: 'Balanced Mix (+ − × ÷)',
  ADD: 'Addition (+)',
  SUBTRACT: 'Subtraction (−)',
  MULTIPLY: 'Multiplication (×)',
  DIVIDE: 'Division (÷ Choices)',
};

export const MathLobbyRoomView: React.FC = () => {
  const { user } = useAuth();
  const {
    mathRoom,
    chatMessages,
    leaveRoom,
    toggleReady,
    addGuestPlayer,
    startMatch,
    kickPlayer,
    sendChatMessage,
  } = useMathGame();
  const { speakingUsers } = useVoiceChat();
  const [copied, setCopied] = useState(false);

  if (!mathRoom || !user) return null;

  const isHost = mathRoom.hostUserId === user.id;
  const me = mathRoom.players.find((p) => p.userId === user.id);
  const isReady = me?.isReady || false;
  const allReady = mathRoom.players.every((p) => p.isReady);
  const canStart = mathRoom.players.length >= 2 && allReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(mathRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-surface border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
              MathBlitz · 10 Rounds
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
              {OP_LABELS[mathRoom.operationMode]}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Calculator className="w-7 h-7 text-amber-400" />
            <span>MathBlitz Room Lobby</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            2–6 Players · 3s Random Pick (1–99) · 1-Min (60s) Equation Race · Highest Score Wins
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 hover:border-amber-400/60 transition-all group cursor-pointer"
            title="Copy room code"
          >
            <div className="text-left">
              <span className="text-[9px] font-mono uppercase text-slate-500 block leading-none mb-0.5">
                Room Code
              </span>
              <span className="font-mono font-black text-lg text-amber-300 tracking-widest leading-none">
                {mathRoom.roomCode}
              </span>
            </div>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400 group-hover:text-white" />
            )}
          </button>

          <button
            onClick={leaveRoom}
            className="px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Leave
          </button>
        </div>
      </div>

      {/* Main Content Grid: Roster + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Roster Panel */}
        <div className="lg:col-span-7 bg-card border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Players ({mathRoom.players.length} / {mathRoom.maxPlayers})</span>
              </h2>

              {isHost && mathRoom.players.length < mathRoom.maxPlayers && (
                <button
                  onClick={addGuestPlayer}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add AI Bot</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mathRoom.players.map((p) => {
                const isMe = p.userId === user.id;
                const playerIsHost = p.userId === mathRoom.hostUserId;
                const speaking = speakingUsers.has(p.userId);

                return (
                  <div
                    key={p.userId}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                      speaking
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-md'
                        : isMe
                        ? 'border-amber-400/40 bg-amber-500/5'
                        : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-white truncate">
                        <span className="truncate">{p.username}</span>
                        {playerIsHost && (
                          <span title="Room Host" className="inline-flex shrink-0">
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <RankEmblem tier={p.tier} division={p.division} size="sm" showLabel={true} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                          Waiting
                        </span>
                      )}

                      {isHost && !isMe && (
                        <button
                          onClick={() => kickPlayer(p.userId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={`Kick ${p.username}`}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {Array.from({ length: Math.max(0, mathRoom.maxPlayers - mathRoom.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-3.5 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/30 flex items-center justify-center text-xs font-mono text-slate-600"
                >
                  Open Slot
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <OpenMicControlBar compact={true} />

            {isHost ? (
              <button
                onClick={startMatch}
                disabled={!canStart}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-glow hover:scale-[1.01] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {mathRoom.players.length < 2
                    ? 'Need at least 2 players (or add AI Bot)'
                    : !allReady
                    ? 'Waiting for all players to mark Ready'
                    : 'Start MathBlitz Match (10 Rounds)'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => toggleReady(!isReady)}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isReady
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-glow'
                }`}
              >
                {isReady ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span>{isReady ? 'Ready (Click to Cancel)' : 'Mark Ready to Race'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-5 flex flex-col">
          <LobbyChatBox
            messages={chatMessages}
            onSend={sendChatMessage}
            className="flex-1 min-h-[340px]"
            maxHeight="max-h-[380px]"
          />
        </div>
      </div>
    </div>
  );
};
