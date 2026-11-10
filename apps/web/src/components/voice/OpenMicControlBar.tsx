import { AlertCircle, HeadphoneOff, Headphones, Mic, MicOff, PhoneOff, Radio, Volume2, VolumeX, X } from 'lucide-react';
import React from 'react';
import { useGame } from '../../context/GameContext.js';
import { useVoiceChat } from '../../context/VoiceChatContext.js';

interface OpenMicControlBarProps {
  compact?: boolean;
}

export const OpenMicControlBar: React.FC<OpenMicControlBarProps> = ({ compact = false }) => {
  const { currentRoom } = useGame();
  const {
    isOpenMicEnabled,
    isMuted,
    isDeafened,
    isSpeaking,
    activePeersCount,
    error,
    toggleOpenMic,
    toggleMute,
    toggleDeafen,
    clearError,
  } = useVoiceChat();

  // Voice chat is available across all events (Casual, Ranked, and Private)
  if (!currentRoom) {
    return null;
  }

  return (
    <div className="w-full space-y-2 animate-fadeIn">
      {/* Microphone Permission / Device Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Open Mic Bar */}
      <div
        className={`rounded-2xl border transition-all flex items-center justify-between gap-3 px-3.5 py-2.5 shadow-xl ${
          isOpenMicEnabled
            ? isSpeaking && !isMuted
              ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-glowEmerald'
              : 'bg-slate-900/90 border-indigo-500/40 shadow-glow'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Left Side: Status & Label */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              isOpenMicEnabled
                ? isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isSpeaking
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-glowEmerald animate-pulse'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isOpenMicEnabled ? (
              isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )
            ) : (
              <Radio className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                {isOpenMicEnabled ? (isMuted ? 'Mic Muted' : 'Open Mic Active') : 'Room Open Mic'}
              </span>
              {isOpenMicEnabled && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isMuted ? 'bg-rose-500' : isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                  }`}
                />
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-mono truncate">
              {isOpenMicEnabled
                ? `${activePeersCount} peer${activePeersCount === 1 ? '' : 's'} connected • Encrypted Voice`
                : 'P2P open mic voice chat with players'}
            </p>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isOpenMicEnabled ? (
            <>
              {/* Mute/Unmute Mic */}
              <button
                type="button"
                onClick={toggleMute}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                  isMuted
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                {!compact && <span className="text-[11px]">{isMuted ? 'Muted' : 'Mute'}</span>}
              </button>

              {/* Deafen (Mute Incoming Audio) */}
              <button
                type="button"
                onClick={toggleDeafen}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 ${
                  isDeafened
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={isDeafened ? 'Undeafen (Hear Room Audio)' : 'Deafen (Mute Room Audio)'}
              >
                {isDeafened ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                )}
                {!compact && <span className="text-[11px]">{isDeafened ? 'Deaf' : 'Audio'}</span>}
              </button>

              {/* Disconnect from Voice */}
              <button
                type="button"
                onClick={() => toggleOpenMic()}
                className="p-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all active:scale-95"
                title="Disconnect from Open Mic"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Enable Open Mic Button */
            <button
              type="button"
              onClick={() => toggleOpenMic()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span>Join Voice</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
