import { Check, CheckCircle2, Clock, Copy, Crown, LogOut, Mic, MicOff, Play, Shield, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useGame } from '../../context/GameContext.js';
import { useVoiceChat } from '../../context/VoiceChatContext.js';
import { OpenMicControlBar } from '../voice/OpenMicControlBar.js';
import { RankEmblem } from '../RankEmblem.js';

export const LobbyRoomView: React.FC = () => {
  const { user } = useAuth();
  const { currentRoom, leaveRoom, toggleReady, startMatch, error } = useGame();
  const { speakingUsers, mutedUsers, isOpenMicEnabled } = useVoiceChat();
  const [copied, setCopied] = useState(false);

  if (!currentRoom) return null;

  const isHost = currentRoom.hostUserId === user?.id;
  const myPlayer = currentRoom.players.find((p) => p.userId === user?.id);
  const isReady = myPlayer?.isReady ?? false;
  const allReady = currentRoom.players.length >= 2 && currentRoom.players.every((p) => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn">
      {/* Lobby Header Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-surface border border-slate-800 p-3.5 sm:p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
              Private Room Lobby
            </span>
            <span className="text-xs text-slate-400 font-mono">Max 8 Scholars</span>
          </div>

          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Room Code: <span className="font-mono text-accent-secondary tracking-widest">{currentRoom.roomCode}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Share this code or invitation link with friends to enter the word chain lobby.
          </p>
        </div>

        {/* Copy Button */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleCopyCode}
            className="flex-1 md:flex-initial px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Code Copied!' : 'Copy Room Code'}</span>
          </button>

          <button
            onClick={leaveRoom}
            className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors"
            title="Leave Lobby"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Private Room Voice Chat Bar */}
      <OpenMicControlBar compact={true} />

      {error && (
        <div className="p-3 rounded-xl bg-state-danger/15 border border-state-danger/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Roster of Connected Scholars */}
      <div className="bg-card border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-secondary" /> Connected Scholars ({currentRoom.players.length}/8)
          </h3>
          <span className="text-[11px] sm:text-xs text-slate-500 font-mono">At least 2 required to start</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {currentRoom.players.map((player) => {
            const isPlayerHost = player.userId === currentRoom.hostUserId;
            const isMe = player.userId === user?.id;
            const isSpeaking = speakingUsers.has(player.userId);
            const isUserMuted = mutedUsers.has(player.userId);

            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/80 border transition-all ${
                  isSpeaking
                    ? 'border-emerald-500/70 shadow-glowEmerald bg-emerald-950/20'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs sm:text-sm text-slate-200 transition-all shrink-0 ${
                      isSpeaking ? 'ring-2 ring-emerald-400 shadow-glowEmerald animate-pulse' : ''
                    }`}
                  >
                    {player.username.substring(0, 2).toUpperCase()}
                    {isPlayerHost && (
                      <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 rounded-full shadow-md" title="Host">
                        <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-950" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{player.username}</span>
                      {isMe && (
                        <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase shrink-0">
                          YOU
                        </span>
                      )}
                      {/* Voice Activity Pill */}
                      {isOpenMicEnabled && (
                        isUserMuted ? (
                          <span title="Muted" className="text-rose-400 p-0.5 rounded bg-rose-500/10 shrink-0">
                            <MicOff className="w-3 h-3" />
                          </span>
                        ) : isSpeaking ? (
                          <span title="Speaking" className="text-emerald-400 p-0.5 rounded bg-emerald-500/10 animate-bounce shrink-0">
                            <Mic className="w-3 h-3" />
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 min-w-0">
                      <RankEmblem tier={player.tier} division={player.division} size="sm" showLabel={true} />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {player.isReady ? (
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 sm:px-2.5 py-1 rounded-lg">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Waiting
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-surface border border-slate-800 shadow-xl">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          {isHost ? (
            allReady ? (
              <span className="text-emerald-400 font-semibold">All scholars ready! You can now start the match.</span>
            ) : (
              <span>Waiting for all scholars to toggle Ready before launch...</span>
            )
          ) : (
            <span>Toggle your status to Ready to signal the room host.</span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {!isHost && (
            <button
              onClick={() => toggleReady(!isReady)}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                isReady
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-glowEmerald'
              }`}
            >
              {isReady ? 'Cancel Ready' : 'Mark as Ready'}
            </button>
          )}

          {isHost && (
            <button
              onClick={startMatch}
              disabled={!allReady}
              className={`flex-1 sm:flex-initial px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-glow ${
                allReady
                  ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Match</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
