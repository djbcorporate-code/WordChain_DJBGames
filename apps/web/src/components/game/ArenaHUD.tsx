import { GameMode, PlayerInGame } from '@wordchain/shared';
import { Flame, Volume2, VolumeX, X } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../../utils/sound.js';
import { CenterWordStage } from './CenterWordStage.js';
import { PlayerPodium } from './PlayerPodium.js';
import { RadialTimer } from './RadialTimer.js';
import { SpectatorOverlay } from './SpectatorOverlay.js';

interface ArenaHUDProps {
  mode: GameMode;
  roundNumber: number;
  currentWord: string;
  requiredLetter: string;
  wordHistory: string[];
  players: PlayerInGame[];
  activeUserId: string;
  myUserId: string;
  remainingMs: number;
  totalDurationMs: number;
  isMyTurn: boolean;
  peerTypingSuffix?: string;
  lastRejectionReason?: string | null;
  shakeTrigger?: number;
  onSubmitWord: (word: string) => void;
  onTypingUpdate?: (suffix: string) => void;
  onLeaveMatch: () => void;
}

export const ArenaHUD: React.FC<ArenaHUDProps> = ({
  mode,
  roundNumber,
  requiredLetter,
  wordHistory,
  players,
  activeUserId,
  myUserId,
  remainingMs,
  totalDurationMs,
  isMyTurn,
  peerTypingSuffix = '',
  lastRejectionReason,
  shakeTrigger = 0,
  onSubmitWord,
  onTypingUpdate = () => {},
  onLeaveMatch,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const myPlayer = players.find((p) => p.userId === myUserId);
  const isSpectating = !myPlayer || !myPlayer.isAlive;
  const alivePlayers = players.filter((p) => p.isAlive);
  const activePlayer = players.find((p) => p.userId === activeUserId);
  const isRound20Plus = roundNumber >= 20;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5 flex flex-col justify-between min-h-[100dvh] gap-3 sm:gap-4 animate-fadeIn">
      {/* Top Header: Clean, Uncluttered Arena Navigation */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-mono font-black px-2.5 py-0.5 rounded-lg bg-accent-primary/20 text-indigo-300 border border-accent-primary/30 uppercase tracking-wider">
            {mode} ARENA
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
            {alivePlayers.length} / {players.length} Alive
          </span>
          {isRound20Plus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Flame className="w-3 h-3 text-rose-400" /> SUDDEN DEATH
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title={isMuted ? 'Unmute Audio & Music' : 'Mute Audio & Music'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <button
            onClick={onLeaveMatch}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition-colors"
            title="Leave Match"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Center Stage: Radial Timer + Animated Pop-up Word Stage */}
      <div className="flex flex-col items-center justify-center gap-4 my-auto py-2">
        <RadialTimer
          remainingMs={remainingMs}
          totalDurationMs={totalDurationMs}
          isActive={true}
          size={90}
        />

        <CenterWordStage
          requiredPrefix={requiredLetter}
          roundNumber={roundNumber}
          isMyTurn={isMyTurn}
          activePlayerUsername={activePlayer?.username || 'Scholar'}
          peerTypingSuffix={peerTypingSuffix}
          wordHistory={wordHistory}
          lastAcceptedByUsername={activePlayer?.username}
          lastRejectionReason={lastRejectionReason}
          shakeTrigger={shakeTrigger}
          onSubmitSuffix={(suffix) => onSubmitWord(suffix)}
          onTypingUpdate={onTypingUpdate}
        />
      </div>

      {/* Bottom Area: Minimalist Scholar Podiums Grid or Spectator Banner */}
      <div className="pt-1 pb-safe">
        {isSpectating ? (
          <SpectatorOverlay
            aliveCount={alivePlayers.length}
            totalPlayers={players.length}
            roundNumber={roundNumber}
            onLeaveMatch={onLeaveMatch}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {players.map((player) => (
              <PlayerPodium
                key={player.userId}
                player={player}
                isCurrentTurn={player.userId === activeUserId}
                isSelf={player.userId === myUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
