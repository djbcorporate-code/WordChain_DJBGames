import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  FastForward,
  Flame,
  LogOut,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  ShieldCheck,
  Skull,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AgentAvatar } from '../components/impostor/AgentAvatar.js';
import { useAuth } from '../context/AuthContext.js';
import { useImpostorGame } from '../context/ImpostorGameContext.js';
import { useVoiceChat } from '../context/VoiceChatContext.js';
import { soundManager } from '../utils/sound.js';

export const ImpostorLiveArena: React.FC = () => {
  const { user } = useAuth();
  const {
    impostorRoom,
    matchEnded,
    lastError,
    clearError,
    setReadyToVote,
    castVote,
    sendChatMessage,
    resetRematch,
    leaveRoom,
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
  } = useVoiceChat();

  const [isDossierFlippedOpen, setIsDossierFlippedOpen] = useState(true);
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundManager.getMuted());
  const [nowMs, setNowMs] = useState(Date.now());
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Compute server clock offset when state updates arrive
  const clockOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (impostorRoom?.serverNowUtc) {
      clockOffsetRef.current = impostorRoom.serverNowUtc - Date.now();
    }
  }, [impostorRoom?.serverNowUtc]);

  // Smooth countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now() + clockOffsetRef.current);
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Automatically reveal dossier card when ROLE_REVEAL starts
  useEffect(() => {
    if (impostorRoom?.phase === 'ROLE_REVEAL') {
      setIsDossierFlippedOpen(true);
    }
  }, [impostorRoom?.phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [impostorRoom?.chatHistory?.length]);

  const alivePlayers = useMemo(
    () => (impostorRoom?.players || []).filter((p) => p.isAlive),
    [impostorRoom?.players]
  );

  if (!impostorRoom || !user) return null;

  const isHost = impostorRoom.hostUserId === user.id;
  const myPlayer = impostorRoom.players.find((p) => p.userId === user.id);
  const isImpostor = impostorRoom.myRole === 'IMPOSTOR';
  const phase = impostorRoom.phase || 'ROLE_REVEAL';

  const deadline = impostorRoom.phaseDeadlineUtc || 0;
  const started = impostorRoom.phaseStartedAtUtc || deadline;
  const totalPhaseMs = Math.max(1000, deadline - started);
  const remainingMs = Math.max(0, deadline - nowMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progressPct = deadline
    ? Math.max(0, Math.min(100, (remainingMs / totalPhaseMs) * 100))
    : 0;

  const connectedAlive = alivePlayers.filter((p) => !p.isDisconnected);
  const readyCount = alivePlayers.filter((p) => p.readyToVote).length;
  const readyTarget = connectedAlive.length > 0 ? connectedAlive.length : alivePlayers.length;

  const allyNames = (impostorRoom.allyImpostorIds || [])
    .map((id) => impostorRoom.players.find((p) => p.userId === id)?.username)
    .filter(Boolean);

  const handleToggleAudioMute = () => {
    setIsSoundMuted(soundManager.toggleMute());
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !myPlayer?.isAlive) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const finalSummary = matchEnded ||
    (impostorRoom.status === 'FINISHED' && impostorRoom.winnerFaction
      ? {
          winnerFaction: impostorRoom.winnerFaction,
          secretWord: impostorRoom.secretWord || '???',
          impostorHint: impostorRoom.impostorHint || '???',
          resolvedCategory: impostorRoom.resolvedCategory,
          players: impostorRoom.players,
        }
      : null);

  return (
    <div className="min-h-[100dvh] bg-[#05060a] text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Ambient Noir Lighting by Role/Phase */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-[150px] transition-colors duration-700 ${
            phase === 'VOTING' || isImpostor ? 'bg-rose-600/15' : 'bg-emerald-600/10'
          }`}
        />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-red-950/25 blur-[150px]" />
      </div>

      {/* Top HUD Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a11]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/35 text-[11px] font-black uppercase tracking-widest text-rose-300">
              ROUND {impostorRoom.roundNumber || 1}
            </span>
            {impostorRoom.resolvedCategory ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white">
                <span>{impostorRoom.resolvedCategory.emoji}</span>
                <span>{impostorRoom.resolvedCategory.label}</span>
                <span className="text-[10px] font-black uppercase text-amber-300 ml-1">
                  · {impostorRoom.resolvedCategory.difficulty}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-500/25 bg-rose-950/35 text-[11px] font-black uppercase tracking-wider text-rose-200/90">
                <span>🔒</span>
                <span>Category Concealed</span>
              </div>
            )}
          </div>

          {/* Center Phase + Countdown Clock */}
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.18em] border ${
                phase === 'VOTING'
                  ? 'border-rose-500 bg-rose-600/25 text-rose-200 animate-pulse'
                  : phase === 'EJECTION'
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-white/15 bg-white/5 text-zinc-200'
              }`}
            >
              {phase === 'ROLE_REVEAL'
                ? 'INTEL REVEAL'
                : phase === 'CONVERSATION'
                ? 'INTERROGATION'
                : phase === 'VOTING'
                ? 'VOTING BOOTHS'
                : phase === 'EJECTION'
                ? 'VERDICT'
                : 'DEBRIEFING'}
            </span>
            {deadline > 0 && phase !== 'FINISHED' && (
              <span
                className={`font-mono text-lg font-black tabular-nums ${
                  remainingSec <= 10 ? 'text-rose-400 animate-urgent' : 'text-white'
                }`}
              >
                {remainingSec}s
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleOpenMic}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isOpenMicEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-zinc-300 hover:text-white'
              }`}
            >
              {isOpenMicEnabled && !isMuted ? (
                <Mic className="w-3.5 h-3.5" />
              ) : (
                <MicOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isOpenMicEnabled ? 'Mic On' : 'Open Mic'}</span>
            </button>

            {isOpenMicEnabled && (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-1.5 rounded-lg border cursor-pointer ${
                    isMuted
                      ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                      : 'border-white/10 bg-white/5 text-zinc-300'
                  }`}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleDeafen}
                  className={`p-1.5 rounded-lg border cursor-pointer ${
                    isDeafened
                      ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-white/5 text-zinc-300'
                  }`}
                  title="Toggle Voice Output"
                >
                  {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </>
            )}

            <button
              onClick={handleToggleAudioMute}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
              title="Toggle Game SFX"
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={leaveRoom}
              className="p-1.5 sm:px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-rose-600/20 hover:border-rose-500/40 text-zinc-300 hover:text-rose-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Smooth Countdown Progress Strip */}
        {deadline > 0 && phase !== 'FINISHED' && (
          <div className="h-1 w-full bg-white/5">
            <div
              className={`h-full transition-all duration-200 ${
                remainingSec <= 10
                  ? 'bg-rose-500'
                  : phase === 'VOTING'
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </header>

      {lastError && (
        <div className="max-w-5xl mx-auto mt-3 px-4 w-full">
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
            <span>{lastError}</span>
            <button onClick={clearError} className="font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Arena Workspace */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Interactive 3D Classified Dossier Card + Quick Controls */}
        <section className="lg:col-span-4 space-y-4">
          <div className="perspective-1200">
            <div
              onClick={() => setIsDossierFlippedOpen((v) => !v)}
              className={`relative w-full min-h-[220px] transition-transform duration-500 preserve-3d cursor-pointer ${
                isDossierFlippedOpen ? '' : 'rotate-y-180'
              }`}
            >
              {/* FRONT FACE: Revealed Mission Intel */}
              <div
                className={`backface-hidden rounded-3xl border p-5 flex flex-col justify-between min-h-[220px] shadow-2xl overflow-hidden ${
                  isImpostor
                    ? 'border-rose-500/45 bg-gradient-to-br from-[#230911] via-[#13070e] to-[#08090f]'
                    : 'border-emerald-500/35 bg-gradient-to-br from-[#082019] via-[#091215] to-[#08090f]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                      isImpostor
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {isImpostor ? (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        YOU ARE THE IMPOSTOR
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        CREWMATE CLEARANCE
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 inline-flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" />
                    Tap to Hide
                  </span>
                </div>

                <div className="my-4 space-y-2 text-center">
                  {isImpostor ? (
                    <>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-300/80">
                        YOUR SUBTLE WORD HINT
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white leading-snug px-2">
                        “{impostorRoom.impostorHint || 'Read the room carefully...'}”
                      </div>
                      {allyNames.length > 0 && (
                        <div className="pt-1 text-xs font-bold text-rose-300">
                          Fellow Impostor: {allyNames.join(', ')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300/80">
                        CLASSIFIED SECRET WORD
                      </div>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {impostorRoom.secretWord}
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 text-center border-t border-white/10 pt-2.5">
                  {isImpostor
                    ? 'You do not see the exact word. Listen to clues and blend in!'
                    : 'Give a clue without naming it outright. Flush out the Impostor!'}
                </div>
              </div>

              {/* BACK FACE: Concealed Noir Cover */}
              <div className="backface-hidden rotate-y-180 absolute inset-0 rounded-3xl border border-white/15 bg-gradient-to-br from-[#0e111a] to-[#06070c] p-6 flex flex-col items-center justify-center text-center shadow-2xl">
                <Eye className="w-9 h-9 text-zinc-500 mb-3" />
                <div className="text-sm font-black uppercase tracking-[0.25em] text-zinc-200">
                  INTEL CONCEALED
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Tap card anytime to peek privately at your word or hint.
                </p>
              </div>
            </div>
          </div>

          {/* Ready To Vote Fast-Forward Control (During CONVERSATION) */}
          {phase === 'CONVERSATION' && myPlayer?.isAlive && (
            <button
              onClick={() => setReadyToVote(!myPlayer.readyToVote)}
              className={`w-full py-3.5 px-4 rounded-2xl border font-black uppercase tracking-[0.16em] text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                myPlayer.readyToVote
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-lg shadow-amber-500/15'
                  : 'border-rose-500/40 bg-gradient-to-r from-rose-600/85 to-red-700/85 hover:from-rose-500 hover:to-red-600 text-white shadow-lg shadow-rose-700/25'
              }`}
            >
              <FastForward className="w-4 h-4" />
              {myPlayer.readyToVote
                ? `Waiting on Squad (${readyCount}/${readyTarget} Ready)`
                : `Ready to Vote Early (${readyCount}/${readyTarget})`}
            </button>
          )}

          {/* Ejected Ghost Notice */}
          {myPlayer && !myPlayer.isAlive && phase !== 'FINISHED' && (
            <div className="rounded-2xl border border-rose-500/35 bg-rose-950/35 p-4 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-300">
                <Skull className="w-4 h-4" />
                YOU WERE EJECTED
              </div>
              <p className="text-xs text-zinc-400">
                You are observing as a silent spectator until the mission finishes.
              </p>
            </div>
          )}
        </section>

        {/* CENTER / RIGHT COLUMN: Phase Stage + Suspects + Discussion Chat */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* EJECTION DRAMATIC STAGE */}
          {phase === 'EJECTION' && impostorRoom.lastEjection && (
            <div className="rounded-3xl border border-rose-500/35 bg-gradient-to-b from-[#140a11] to-[#080a10] p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-noir-fade-up">
              <div className="inline-block px-5 py-2 rounded-xl border-4 border-rose-500 text-rose-400 font-black text-xl sm:text-3xl tracking-[0.25em] uppercase animate-stamp-slam">
                {impostorRoom.lastEjection.outcome === 'EJECTED'
                  ? 'AGENT EJECTED'
                  : impostorRoom.lastEjection.outcome === 'TIE'
                  ? 'TIE VOTE'
                  : 'VOTE SKIPPED'}
              </div>

              {impostorRoom.lastEjection.outcome === 'EJECTED' ? (
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {impostorRoom.lastEjection.ejectedUsername}
                  </h2>
                  <p
                    className={`text-sm font-black uppercase tracking-[0.2em] ${
                      impostorRoom.lastEjection.ejectedRole === 'IMPOSTOR'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {impostorRoom.lastEjection.ejectedRole === 'IMPOSTOR'
                      ? '✓ WAS AN IMPOSTOR!'
                      : '✕ WAS AN INNOCENT CREWMATE'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Remaining Impostors in Lobby:{' '}
                    <strong className="text-white">
                      {impostorRoom.lastEjection.remainingImpostors}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-300">
                  No agent was removed this round. Same Secret Word carries forward!
                </p>
              )}

              {/* Animated Vote Tally Bars */}
              <div className="max-w-lg mx-auto space-y-2 pt-2 text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">
                  Official Ballot Tally
                </div>
                {Object.entries(impostorRoom.lastEjection.voteCounts)
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([targetId, count]) => {
                    const label =
                      targetId === 'SKIP'
                        ? '⏭️ Skip Vote'
                        : impostorRoom.players.find((p) => p.userId === targetId)?.username ||
                          'Agent';
                    const pct = Math.min(100, (count / Math.max(1, alivePlayers.length + 1)) * 100);
                    return (
                      <div key={targetId} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-200">{label}</span>
                          <span className="text-rose-300">
                            {count} vote{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* INTERACTIVE VOTING STAGE vs SQUAD ROSTER */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0e17]/95 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {phase === 'VOTING'
                    ? 'Cast Your Ejection Vote'
                    : `Active Agents (${alivePlayers.length} Remaining)`}
                </h3>
              </div>

              {phase === 'VOTING' && myPlayer?.isAlive && (
                <button
                  onClick={() => castVote('SKIP')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    impostorRoom.myVoteTargetId === 'SKIP'
                      ? 'border-amber-400 bg-amber-500/25 text-amber-200'
                      : 'border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip Vote
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {impostorRoom.players.map((p) => {
                const isSelf = p.userId === user.id;
                const isSpeaking = speakingUsers.has(p.userId);
                const isPeerMuted = mutedUsers.has(p.userId);
                const isVotedByMe = impostorRoom.myVoteTargetId === p.userId;
                const canVoteForTarget = phase === 'VOTING' && myPlayer?.isAlive && p.isAlive;

                return (
                  <button
                    key={p.userId}
                    type="button"
                    disabled={!canVoteForTarget}
                    onClick={() => canVoteForTarget && castVote(p.userId)}
                    className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isVotedByMe
                        ? 'border-rose-500 bg-rose-600/25 shadow-lg shadow-rose-600/20'
                        : !p.isAlive
                        ? 'border-white/5 bg-black/40 opacity-50'
                        : isSpeaking
                        ? 'border-emerald-500/60 bg-emerald-950/20'
                        : 'border-white/10 bg-white/[0.03]'
                    } ${canVoteForTarget ? 'hover:border-rose-400 hover:bg-rose-500/10 cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AgentAvatar
                        username={p.username}
                        size="sm"
                        isAlive={p.isAlive}
                        isSpeaking={isSpeaking}
                        isImpostorRevealed={p.revealedRole === 'IMPOSTOR'}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs font-black text-white truncate">
                          <span className="truncate">{p.username}</span>
                          {isSelf && <span className="text-[9px] text-zinc-400">(You)</span>}
                          {p.userId === impostorRoom.hostUserId && (
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] font-bold mt-0.5 flex items-center gap-1.5">
                          {p.revealedRole ? (
                            <span
                              className={
                                p.revealedRole === 'IMPOSTOR'
                                  ? 'text-rose-400 uppercase'
                                  : 'text-emerald-400 uppercase'
                              }
                            >
                              {p.revealedRole}
                            </span>
                          ) : phase === 'CONVERSATION' && p.readyToVote ? (
                            <span className="text-amber-300">✓ Ready to Vote</span>
                          ) : phase === 'VOTING' && p.hasVoted ? (
                            <span className="text-emerald-400">✓ Voted</span>
                          ) : (
                            <span className="text-zinc-500">
                              {p.isAlive ? 'In Play' : 'Ejected'}
                            </span>
                          )}
                          {isPeerMuted && <MicOff className="w-3 h-3 text-zinc-600" />}
                        </div>
                      </div>
                    </div>

                    {isVotedByMe && (
                      <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIVE INTERROGATION CHAT */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0e17]/95 flex flex-col h-[270px] sm:h-[310px]">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">
                Interrogation Transcript
              </span>
              <span className="text-[10px] font-semibold text-zinc-500">
                Describe subtly without spoiling!
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 text-xs">
              {(impostorRoom.chatHistory || []).map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.isSystem
                      ? 'text-center text-[11px] font-semibold text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg py-1.5 px-3'
                      : 'flex items-baseline gap-2'
                  }
                >
                  {!msg.isSystem && (
                    <span className="font-black text-rose-300 shrink-0">{msg.username}:</span>
                  )}
                  <span className="text-zinc-200 break-words">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                disabled={!myPlayer?.isAlive && phase !== 'FINISHED'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  myPlayer && !myPlayer.isAlive && phase !== 'FINISHED'
                    ? 'Ejected agents cannot speak until the match concludes...'
                    : 'Share a clue or interrogate suspects...'
                }
                className="flex-1 px-3.5 py-2 rounded-xl border border-white/10 bg-black/50 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 disabled:opacity-45"
              />
              <button
                type="submit"
                disabled={!myPlayer?.isAlive && phase !== 'FINISHED'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* FINAL MISSION RECAP OVERLAY (FINISHED) */}
      {finalSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0a0c13] p-6 sm:p-8 space-y-6 shadow-2xl animate-noir-fade-up max-h-[92vh] overflow-y-auto">
            <div className="text-center space-y-2">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-[0.25em] ${
                  finalSummary.winnerFaction === 'CREWMATES'
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                MISSION CONCLUDED · UNRANKED
              </div>

              <h2
                className={`text-3xl sm:text-5xl font-black tracking-tight ${
                  finalSummary.winnerFaction === 'CREWMATES'
                    ? 'text-emerald-400'
                    : 'text-rose-500'
                }`}
              >
                {finalSummary.winnerFaction === 'CREWMATES'
                  ? 'CREWMATES WIN!'
                  : 'IMPOSTORS WIN!'}
              </h2>
            </div>

            {/* Revealed Secret Intel Pair */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  SECRET WORD {finalSummary.resolvedCategory ? `(${finalSummary.resolvedCategory.label})` : ''}
                </div>
                <div className="text-xl font-black text-white mt-1">
                  {finalSummary.secretWord}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
                  IMPOSTOR HINT
                </div>
                <div className="text-sm font-bold text-rose-100 mt-1.5">
                  “{finalSummary.impostorHint}”
                </div>
              </div>
            </div>

            {/* Revealed Identities List */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Agent Dossier Reveals
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {finalSummary.players.map((p) => {
                  const wasImpostor = p.revealedRole === 'IMPOSTOR';
                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        wasImpostor
                          ? 'border-rose-500/40 bg-rose-950/25'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AgentAvatar
                          username={p.username}
                          size="sm"
                          isAlive={p.isAlive}
                          isImpostorRevealed={wasImpostor}
                        />
                        <span className="text-xs font-black text-white truncate">
                          {p.username}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                          wasImpostor
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {p.revealedRole || 'CREWMATE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Post-Match Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {impostorRoom.mode === 'PRIVATE' && isHost && (
                <button
                  onClick={resetRematch}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-black uppercase tracking-[0.18em] text-xs text-white inline-flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again (Back to Lobby)
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="flex-1 py-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-black uppercase tracking-[0.18em] text-xs text-white transition-colors cursor-pointer"
              >
                Return to Spy Lounge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
