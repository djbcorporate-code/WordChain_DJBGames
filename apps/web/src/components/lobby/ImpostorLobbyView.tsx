import React, { useEffect, useRef, useState } from 'react';
import {
  clampImpostorCount,
  IMPOSTOR_CATEGORIES,
  IMPOSTOR_CONVERSATION_PRESETS,
  ImpostorCategoryId,
  ImpostorDifficulty,
} from '@wordchain/shared';
import {
  Check,
  Clock,
  Copy,
  Crown,
  LogOut,
  Mic,
  MicOff,
  Play,
  Send,
  Settings2,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useImpostorGame } from '../../context/ImpostorGameContext.js';
import { useVoiceChat } from '../../context/VoiceChatContext.js';
import { AgentAvatar } from '../impostor/AgentAvatar.js';

export const ImpostorLobbyView: React.FC = () => {
  const { user } = useAuth();
  const {
    impostorRoom,
    countdownRemaining,
    lastError,
    clearError,
    leaveRoom,
    toggleReady,
    startMatch,
    kickPlayer,
    sendChatMessage,
    updateSettings,
  } = useImpostorGame();

  const {
    isOpenMicEnabled,
    isMuted,
    isDeafened,
    speakingUsers,
    mutedUsers,
    toggleOpenMic,
    toggleMute,
    toggleDeafen,
    error: voiceError,
  } = useVoiceChat();

  const [copiedCode, setCopiedCode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [impostorRoom?.chatHistory?.length]);

  if (!impostorRoom || !user) return null;

  const isHost = impostorRoom.hostUserId === user.id;
  const myPlayer = impostorRoom.players.find((p) => p.userId === user.id);
  const effectiveImpostors = clampImpostorCount(
    impostorRoom.settings.impostorCount,
    Math.max(impostorRoom.players.length, 3)
  );
  const allReady = impostorRoom.players.every((p) => p.isReady);
  const canStart =
    isHost &&
    impostorRoom.players.length >= impostorRoom.minPlayers &&
    allReady &&
    impostorRoom.status === 'WAITING';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(impostorRoom.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const filteredCategories =
    impostorRoom.settings.difficulty === 'ALL'
      ? IMPOSTOR_CATEGORIES
      : IMPOSTOR_CATEGORIES.filter((c) => c.difficulty === impostorRoom.settings.difficulty);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#06070c] text-zinc-100 py-6 px-4 sm:px-6 relative overflow-hidden">
      {/* Subtle Ambient Noir Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-rose-600/10 blur-[120px]" />

      {/* Countdown Launch Banner */}
      {impostorRoom.status === 'COUNTDOWN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center space-y-4 animate-noir-fade-up">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-rose-400">
              DEPLOYING CLASSIFIED DOSSIERS
            </div>
            <div className="text-7xl sm:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(244,63,94,0.7)] tabular-nums">
              {countdownRemaining ?? 3}
            </div>
            <p className="text-sm text-zinc-400">Conceal your screen from spectators nearby...</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6 relative z-10 animate-noir-fade-up">
        {/* Room Header Bar */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0d15]/95 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl border border-rose-500/35 bg-rose-500/10 flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">
                CODE
              </span>
              <span className="font-mono text-base font-black tracking-[0.2em] text-white">
                {impostorRoom.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-rose-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-rose-400">
                {impostorRoom.mode === 'CASUAL' ? 'PUBLIC CASUAL BRIEFING' : 'PRIVATE STAGING LOUNGE'}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {impostorRoom.players.length} / {impostorRoom.maxPlayers} Human Agents (Min{' '}
                {impostorRoom.minPlayers} · No AI Bots)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {myPlayer && (
              <button
                onClick={() => toggleReady(!myPlayer.isReady)}
                disabled={impostorRoom.status !== 'WAITING'}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  myPlayer.isReady
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                }`}
              >
                {myPlayer.isReady ? '✓ Ready' : 'Click Ready Up'}
              </button>
            )}

            {isHost && (
              <button
                onClick={startMatch}
                disabled={!canStart}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-600/25 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Mission
              </button>
            )}

            <button
              onClick={leaveRoom}
              className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          </div>
        </div>

        {(lastError || voiceError) && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              {lastError || voiceError}
            </span>
            <button onClick={clearError} className="font-bold underline cursor-pointer">
              Close
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Live Host Mission Setup + Agents Grid */}
          <div className="lg:col-span-8 space-y-6">
            {/* Live Host Setup Console */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    Host Mission Parameters
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-zinc-400">
                  {isHost ? 'You control live lobby rules' : 'Synced live from Host'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1.5">
                    Difficulty Tier
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['ALL', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as ImpostorDifficulty[]).map(
                      (diff) => (
                        <button
                          key={diff}
                          type="button"
                          disabled={!isHost}
                          onClick={() => {
                            const patch: { difficulty: ImpostorDifficulty; category?: ImpostorCategoryId } = {
                              difficulty: diff,
                            };
                            if (
                              diff !== 'ALL' &&
                              impostorRoom.settings.category !== 'RANDOM' &&
                              IMPOSTOR_CATEGORIES.find((c) => c.id === impostorRoom.settings.category)
                                ?.difficulty !== diff
                            ) {
                              patch.category = 'RANDOM';
                            }
                            updateSettings(patch);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-colors ${
                            impostorRoom.settings.difficulty === diff
                              ? 'border-rose-500 bg-rose-600/25 text-white'
                              : 'border-white/10 bg-white/5 text-zinc-400'
                          } ${isHost ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-80'}`}
                        >
                          {diff}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Conversation Timer */}
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Conversation Timer Before Voting
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {IMPOSTOR_CONVERSATION_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={!isHost}
                        onClick={() => updateSettings({ conversationSec: sec })}
                        className={`py-1.5 rounded-lg text-[11px] font-black border transition-colors ${
                          impostorRoom.settings.conversationSec === sec
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-white/10 bg-white/5 text-zinc-400'
                        } ${isHost ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-80'}`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Select (Host Eyes Only — Concealed to Joined Players) */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1.5">
                    Category {isHost ? '(Concealed From Joined Players)' : ''}
                  </label>
                  {isHost ? (
                    <select
                      value={
                        impostorRoom.settings.category === 'CONCEALED'
                          ? 'RANDOM'
                          : impostorRoom.settings.category
                      }
                      onChange={(e) =>
                        updateSettings({ category: e.target.value as ImpostorCategoryId })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-white/15 bg-black/60 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="RANDOM">
                        🎲 Random ({impostorRoom.settings.difficulty} Pool)
                      </option>
                      {filteredCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.label} ({cat.difficulty})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-950/25 text-xs font-black tracking-wider text-rose-300 flex items-center justify-between">
                      <span>🔒 CLASSIFIED · HOST ONLY</span>
                      <span className="text-[10px] text-rose-400/80 uppercase">Redacted</span>
                    </div>
                  )}
                </div>

                {/* Impostor Count */}
                <div>
                  <label className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-rose-400" />
                      Impostors
                    </span>
                    {effectiveImpostors < impostorRoom.settings.impostorCount && (
                      <span className="text-[10px] text-amber-300 font-bold">
                        Capped at {effectiveImpostors} until more join
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        disabled={!isHost}
                        onClick={() => updateSettings({ impostorCount: cnt })}
                        className={`py-2 rounded-lg text-xs font-black border transition-colors ${
                          impostorRoom.settings.impostorCount === cnt
                            ? 'border-rose-500 bg-rose-600/25 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400'
                        } ${isHost ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-80'}`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Seated Human Agents Roster */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Seated Agents ({impostorRoom.players.length} / {impostorRoom.maxPlayers})
                </h3>
                {impostorRoom.players.length < impostorRoom.minPlayers && (
                  <span className="text-xs font-bold text-amber-300 animate-pulse">
                    Waiting for {impostorRoom.minPlayers - impostorRoom.players.length} more real
                    player(s)...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {impostorRoom.players.map((p) => {
                  const isSelf = p.userId === user.id;
                  const isAgentHost = p.userId === impostorRoom.hostUserId;
                  const isSpeaking = speakingUsers.has(p.userId);
                  const isPeerMuted = mutedUsers.has(p.userId);

                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        isSpeaking
                          ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : p.isReady
                          ? 'border-white/15 bg-white/[0.04]'
                          : 'border-white/10 bg-black/30 opacity-85'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AgentAvatar
                          username={p.username}
                          size="sm"
                          isSpeaking={isSpeaking}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white truncate">
                              {p.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase">
                                You
                              </span>
                            )}
                            {isAgentHost && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span
                              className={
                                p.isReady
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-zinc-400 font-medium'
                              }
                            >
                              {p.isReady ? '● Ready' : '○ Standby'}
                            </span>
                            {isPeerMuted && <MicOff className="w-3 h-3 text-zinc-500" />}
                          </div>
                        </div>
                      </div>

                      {isHost && !isSelf && impostorRoom.mode === 'PRIVATE' && (
                        <button
                          onClick={() => kickPlayer(p.userId)}
                          title={`Kick ${p.username}`}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Open Mic Voice + Squad Text Chat */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
            {/* Voice Comms Widget */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  Open Mic Voice Channel
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isOpenMicEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isOpenMicEnabled ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleOpenMic}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isOpenMicEnabled
                      ? 'bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  {isOpenMicEnabled ? 'Leave Voice' : 'Join Open Mic'}
                </button>

                {isOpenMicEnabled && (
                  <>
                    <button
                      onClick={toggleMute}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        isMuted
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border-white/15 bg-white/5 text-zinc-200'
                      }`}
                      title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={toggleDeafen}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        isDeafened
                          ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                          : 'border-white/15 bg-white/5 text-zinc-200'
                      }`}
                      title={isDeafened ? 'Undeafen' : 'Deafen'}
                    >
                      {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Staging Room Chat */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] flex flex-col h-[360px]">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  Lobby Comms
                </span>
                <UserCheck className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
                {(impostorRoom.chatHistory || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.isSystem
                        ? 'text-center text-[11px] text-rose-300/80 bg-rose-500/5 border border-rose-500/15 rounded-lg py-1.5 px-2.5'
                        : 'flex flex-col'
                    }
                  >
                    {!msg.isSystem && (
                      <span className="text-[11px] font-black text-zinc-400">
                        {msg.username}
                      </span>
                    )}
                    <span className={msg.isSystem ? '' : 'text-zinc-200 break-words'}>
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Coordinate lobby setup..."
                  className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-black/50 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
