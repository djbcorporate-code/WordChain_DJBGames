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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Crown,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Send,
  Settings2,
  Share2,
  ShieldAlert,
  Shuffle,
  SlidersHorizontal,
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

const DIFFICULTY_OPTIONS: { id: ImpostorDifficulty; label: string }[] = [
  { id: 'ALL', label: 'All Tiers' },
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
];

type MobileTab = 'squad' | 'setup' | 'comms';

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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('squad');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [impostorRoom?.chatHistory?.length]);

  if (!impostorRoom || !user) return null;

  const isHost = impostorRoom.hostUserId === user.id;
  const isPrivate = impostorRoom.mode === 'PRIVATE';
  const isLocked = impostorRoom.status !== 'WAITING';
  const myPlayer = impostorRoom.players.find((p) => p.userId === user.id);

  const effectiveImpostors = clampImpostorCount(
    impostorRoom.settings.impostorCount,
    Math.max(impostorRoom.players.length, 3)
  );

  const readyCount = impostorRoom.players.filter((p) => p.isReady).length;
  const unreadyPlayers = impostorRoom.players.filter((p) => !p.isReady);
  const allReady = unreadyPlayers.length === 0;
  const hasMinPlayers = impostorRoom.players.length >= impostorRoom.minPlayers;
  const canStart = isHost && hasMinPlayers && allReady && !isLocked;

  const filteredCategories =
    impostorRoom.settings.difficulty === 'ALL'
      ? IMPOSTOR_CATEGORIES
      : IMPOSTOR_CATEGORIES.filter((c) => c.difficulty === impostorRoom.settings.difficulty);

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.id === impostorRoom.settings.difficulty)?.label ??
    impostorRoom.settings.difficulty;

  const selectedCategoryMeta =
    impostorRoom.settings.category === 'RANDOM' || impostorRoom.settings.category === 'CONCEALED'
      ? null
      : IMPOSTOR_CATEGORIES.find((c) => c.id === impostorRoom.settings.category) ?? null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(impostorRoom.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleShareInvite = async () => {
    const inviteText = `Join my Who Is The Impostor lobby on WordChain! Room Code: ${impostorRoom.roomCode}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Who Is The Impostor — Private Room',
          text: inviteText,
        });
        return;
      } catch {
        // Fallback to clipboard when native share is dismissed or unavailable
      }
    }
    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleDifficultyChange = (diff: ImpostorDifficulty) => {
    const patch: { difficulty: ImpostorDifficulty; category?: ImpostorCategoryId } = {
      difficulty: diff,
    };
    if (
      diff !== 'ALL' &&
      impostorRoom.settings.category !== 'RANDOM' &&
      IMPOSTOR_CATEGORIES.find((c) => c.id === impostorRoom.settings.category)?.difficulty !== diff
    ) {
      patch.category = 'RANDOM';
    }
    updateSettings(patch);
  };

  const renderDockStatusMessage = () => {
    if (!hasMinPlayers) {
      const missing = impostorRoom.minPlayers - impostorRoom.players.length;
      return (
        <span className="text-amber-300 font-semibold">
          Need {missing} more human {missing === 1 ? 'agent' : 'agents'} to start ({impostorRoom.players.length}/{impostorRoom.minPlayers} min)
        </span>
      );
    }

    if (!allReady) {
      if (!isHost && myPlayer && !myPlayer.isReady) {
        return (
          <span className="text-amber-200 font-semibold">
            Tap <strong className="text-white">Ready Up</strong> to signal the host
          </span>
        );
      }
      const waitingNames = unreadyPlayers.map((p) => p.username).slice(0, 2).join(', ');
      const extraCount = unreadyPlayers.length > 2 ? ` +${unreadyPlayers.length - 2}` : '';
      return (
        <span className="text-zinc-300">
          Waiting on{' '}
          <span className="font-bold text-amber-300">
            {waitingNames}
            {extraCount}
          </span>{' '}
          ({readyCount}/{impostorRoom.players.length} Ready)
        </span>
      );
    }

    if (isHost) {
      return (
        <span className="text-emerald-300 font-semibold">
          All {impostorRoom.players.length} agents Ready — cleared for mission launch!
        </span>
      );
    }

    return (
      <span className="text-emerald-300 font-semibold">
        All {impostorRoom.players.length} agents Ready — waiting for Host to start...
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#06070c] text-zinc-100 py-4 sm:py-6 px-3 sm:px-6 relative overflow-x-clip">
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

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 relative z-10 animate-noir-fade-up pb-4">
        {/* Top Lobby Header: Room Code, Share & Safe Exit */}
        <header className="rounded-2xl border border-white/10 bg-[#0b0d15]/95 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Whole-Pill Clickable Room Code */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Tap to copy room code"
              className="group px-3.5 py-2 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-400/60 transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">
                CODE
              </span>
              <span className="font-mono text-lg sm:text-xl font-black tracking-[0.2em] text-white">
                {impostorRoom.roomCode}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/35 text-[10px] font-bold text-rose-200 group-hover:text-white transition-colors">
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-rose-300" />
                    <span>Copy</span>
                  </>
                )}
              </span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-rose-400">
                  {isPrivate ? 'PRIVATE STAGING LOUNGE' : 'PUBLIC CASUAL BRIEFING'}
                </span>
                {impostorRoom.settings.blindMode && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-500/20 border border-violet-400/40 text-violet-200">
                    🕶️ Blind
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {impostorRoom.players.length} / {impostorRoom.maxPlayers} Agents Seated · Min{' '}
                {impostorRoom.minPlayers} · No AI Bots
              </div>
            </div>
          </div>

          {/* Right Header Utilities: Invite + Physically Isolated Leave */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {isPrivate && (
              <button
                type="button"
                onClick={handleShareInvite}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-xs font-bold text-zinc-200 hover:text-white inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Invite Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Share Invite</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={leaveRoom}
              className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-black/30 hover:bg-rose-500/15 hover:border-rose-500/40 text-xs font-bold text-zinc-400 hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Leave Lobby"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </header>

        {(lastError || voiceError) && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              {lastError || voiceError}
            </span>
            <button onClick={clearError} className="font-bold underline cursor-pointer shrink-0 ml-3">
              Close
            </button>
          </div>
        )}

        {/* Mobile Quick Navigation Tabs (avoids long scrolling before Ready/Chat/Setup) */}
        <div className="lg:hidden grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0b0e17] border border-white/10">
          <button
            type="button"
            onClick={() => setMobileTab('squad')}
            className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'squad'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agents ({impostorRoom.players.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('setup')}
            className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'setup'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isHost ? 'Setup' : 'Rules'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('comms')}
            className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'comms'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comms</span>
            {isOpenMicEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Agents Roster + Mission Parameters */}
          <div className="lg:col-span-7 space-y-5">
            {/* Seated Human Agents Roster */}
            <section
              className={`rounded-2xl border border-white/10 bg-[#0b0e17] p-4 sm:p-5 space-y-4 ${
                mobileTab === 'squad' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    Seated Agents ({impostorRoom.players.length} / {impostorRoom.maxPlayers})
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                    allReady && hasMinPlayers
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                >
                  {readyCount}/{impostorRoom.players.length} Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                          : 'border-white/10 bg-black/30 opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AgentAvatar username={p.username} size="sm" isSpeaking={isSpeaking} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-white truncate">
                              {p.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase shrink-0">
                                You
                              </span>
                            )}
                            {isAgentHost && (
                              <Crown
                                className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                aria-label="Room Host"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span
                              className={
                                p.isReady
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-amber-300/80 font-medium'
                              }
                            >
                              {p.isReady ? '● Ready' : '○ Not Ready'}
                            </span>
                            {isPeerMuted && <MicOff className="w-3 h-3 text-zinc-500" />}
                          </div>
                        </div>
                      </div>

                      {isHost && !isSelf && isPrivate && (
                        <button
                          type="button"
                          onClick={() => kickPlayer(p.userId)}
                          title={`Kick ${p.username}`}
                          className="p-2 rounded-lg border border-transparent text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Mission Rules / Host Setup Panel */}
            <section
              className={`rounded-2xl border border-white/10 bg-[#0b0e17] p-4 sm:p-5 space-y-4 ${
                mobileTab === 'setup' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    {isHost ? 'Host Mission Parameters' : 'Active Mission Rules'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-zinc-400">
                  {isHost ? 'Live room controls' : 'Synced from Host'}
                </span>
              </div>

              {isHost ? (
                <div className="space-y-4">
                  {/* Difficulty & Impostor Count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                        Difficulty Pool
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleDifficultyChange(opt.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer disabled:opacity-50 ${
                              impostorRoom.settings.difficulty === opt.id
                                ? 'border-rose-500 bg-rose-600/25 text-white shadow-sm shadow-rose-500/20'
                                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {opt.id === 'ALL' ? 'All' : opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-rose-400" />
                          Impostors
                        </span>
                        {effectiveImpostors < impostorRoom.settings.impostorCount && (
                          <span className="text-[10px] text-amber-300 font-bold">
                            Capped at {effectiveImpostors} now
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            disabled={isLocked}
                            onClick={() => updateSettings({ impostorCount: cnt })}
                            className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer disabled:opacity-50 ${
                              impostorRoom.settings.impostorCount === cnt
                                ? 'border-rose-500 bg-rose-600/25 text-white shadow-sm shadow-rose-500/20'
                                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {cnt} {cnt === 1 ? 'Imp' : 'Imps'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Conversation Timer */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-2">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Discussion Timer Before Vote
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {IMPOSTOR_CONVERSATION_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          disabled={isLocked}
                          onClick={() => updateSettings({ conversationSec: sec })}
                          className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer disabled:opacity-50 ${
                            impostorRoom.settings.conversationSec === sec
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secret Category Selector (Quick Interactive Pill Grid) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                        Secret Category (Concealed From Joined Players)
                      </label>
                      {impostorRoom.settings.category !== 'RANDOM' && (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            updateSettings({ category: 'RANDOM' });
                            setShowCategoryGrid(false);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-300 hover:text-white cursor-pointer disabled:opacity-50"
                        >
                          <Shuffle className="w-3 h-3" />
                          Reset Random
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setShowCategoryGrid((v) => !v)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 hover:border-rose-500/50 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">
                          {selectedCategoryMeta ? selectedCategoryMeta.emoji : '🎲'}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {selectedCategoryMeta
                            ? `${selectedCategoryMeta.label} (${selectedCategoryMeta.difficulty})`
                            : `Random Pool (${difficultyLabel})`}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 shrink-0">
                        {showCategoryGrid ? (
                          <>
                            <span>Done</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Change</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </span>
                    </button>

                    {showCategoryGrid && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pt-1 pr-1">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            updateSettings({ category: 'RANDOM' });
                            setShowCategoryGrid(false);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                            impostorRoom.settings.category === 'RANDOM'
                              ? 'border-rose-500 bg-rose-600/25 text-white'
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
                            disabled={isLocked}
                            onClick={() => {
                              updateSettings({ category: cat.id });
                              setShowCategoryGrid(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                              impostorRoom.settings.category === cat.id
                                ? 'border-rose-500 bg-rose-600/25 text-white'
                                : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{cat.emoji}</span>
                            <span className="truncate">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blind Identity Mode Interactive Card Switch */}
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() =>
                      updateSettings({ blindMode: !impostorRoom.settings.blindMode })
                    }
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer disabled:opacity-50 ${
                      impostorRoom.settings.blindMode
                        ? 'border-violet-400/60 bg-violet-950/30 shadow-[0_0_24px_rgba(139,92,246,0.16)]'
                        : 'border-white/10 bg-black/30 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-white flex items-center gap-2">
                        <span>🕶️ Blind Identity Mode</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            impostorRoom.settings.blindMode
                              ? 'bg-violet-500/30 text-violet-200 border border-violet-400/40'
                              : 'bg-white/10 text-zinc-400'
                          }`}
                        >
                          {impostorRoom.settings.blindMode ? 'ON · Roles Hidden' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Players won&apos;t know if they got the Secret Word or the Impostor&apos;s Clue until the vote ends.
                      </p>
                    </div>

                    {/* Visual Switch */}
                    <span
                      aria-hidden="true"
                      className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                        impostorRoom.settings.blindMode
                          ? 'bg-violet-500 justify-end'
                          : 'bg-zinc-700 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                    </span>
                  </button>
                </div>
              ) : (
                /* Compact Read-Only Briefing Strip for Joined Players (no dead greyed buttons) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-white/10 bg-black/35">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Difficulty
                    </div>
                    <div className="text-xs font-black text-white mt-1">{difficultyLabel}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-black/35">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Discussion
                    </div>
                    <div className="text-xs font-black text-amber-300 mt-1">
                      {impostorRoom.settings.conversationSec}s
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-black/35">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Impostors
                    </div>
                    <div className="text-xs font-black text-rose-300 mt-1">
                      {effectiveImpostors} {effectiveImpostors === 1 ? 'Agent' : 'Agents'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-black/35">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Identity Mode
                    </div>
                    <div
                      className={`text-xs font-black mt-1 ${
                        impostorRoom.settings.blindMode ? 'text-violet-300' : 'text-zinc-200'
                      }`}
                    >
                      {impostorRoom.settings.blindMode ? '🕶️ Blind' : 'Standard'}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-4 px-3.5 py-2.5 rounded-xl border border-rose-500/25 bg-rose-950/20 flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-300 inline-flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Category: Classified (Host Only)
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400/80">
                      Hidden Until Reveal
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN: Open Mic Voice + Squad Text Chat */}
          <div
            className={`lg:col-span-5 space-y-4 flex flex-col ${
              mobileTab === 'comms' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Voice Comms Widget */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  Open Mic Voice Channel
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    isOpenMicEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isOpenMicEnabled ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleOpenMic}
                  className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    isOpenMicEnabled
                      ? 'bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  {isOpenMicEnabled ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Leave Voice</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Join Open Mic</span>
                    </>
                  )}
                </button>

                {isOpenMicEnabled && (
                  <>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isMuted
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleDeafen}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDeafened
                          ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                          : 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      {isDeafened ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isDeafened ? 'Deafened' : 'Audio'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Staging Room Chat */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0e17] flex flex-col h-[340px] lg:h-[400px]">
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
                      <span className="text-[11px] font-black text-zinc-400">{msg.username}</span>
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
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Command Dock: Primary Ready / Launch + Quick Voice Controls */}
        <div className="sticky bottom-3 z-30 rounded-2xl border border-white/15 bg-[#0c101b]/95 backdrop-blur-xl p-3.5 sm:px-5 sm:py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.65)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 min-w-0">
            <div className="text-xs leading-snug">{renderDockStatusMessage()}</div>

            {/* Compact Voice Quick-Controls right inside the dock */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isOpenMicEnabled ? (
                <button
                  type="button"
                  onClick={toggleOpenMic}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-bold text-emerald-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Join Mic</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      isMuted
                        ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                        : 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {isMuted ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                    <span>{isMuted ? 'Muted' : 'Mic On'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleDeafen}
                    title={isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDeafened
                        ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                        : 'border-white/15 bg-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {isDeafened ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {isHost ? (
              <>
                {myPlayer && !myPlayer.isReady && (
                  <button
                    type="button"
                    onClick={() => toggleReady(true)}
                    disabled={isLocked}
                    className="px-4 py-3 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-black uppercase tracking-wider text-amber-200 cursor-pointer disabled:opacity-50"
                  >
                    Mark Ready
                  </button>
                )}
                <button
                  type="button"
                  onClick={startMatch}
                  disabled={!canStart}
                  className={`flex-1 sm:flex-initial min-h-[46px] px-7 py-3 rounded-xl font-black uppercase tracking-[0.18em] text-xs inline-flex items-center justify-center gap-2 transition-all ${
                    canStart
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/30 active:scale-[0.98] cursor-pointer'
                      : 'bg-zinc-800/90 text-zinc-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Mission</span>
                </button>
              </>
            ) : (
              myPlayer && (
                <button
                  type="button"
                  onClick={() => toggleReady(!myPlayer.isReady)}
                  disabled={isLocked}
                  className={`flex-1 sm:flex-initial min-h-[46px] px-8 py-3 rounded-xl font-black uppercase tracking-[0.18em] text-xs border inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                    myPlayer.isReady
                      ? 'border-emerald-500/45 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200'
                      : 'border-amber-400/60 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{myPlayer.isReady ? '✓ Ready (Tap to Cancel)' : 'Ready Up'}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
