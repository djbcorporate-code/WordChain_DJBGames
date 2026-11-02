import { GameMode, PlayerInGame } from '@wordchain/shared';
import { Volume2, VolumeX, X } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../../utils/sound.js';
import { CurrentWordDisplay } from './CurrentWordDisplay.js';
import { PlayerPodium } from './PlayerPodium.js';
import { RadialTimer } from './RadialTimer.js';
import { SpectatorOverlay } from './SpectatorOverlay.js';
import { WordInput } from './WordInput.js';

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
  onSubmitWord: (word: string) => void;
  lastRejectionReason?: string | null;
  shakeTrigger?: number;
  onLeaveMatch: () => void;
}

export const ArenaHUD: React.FC<ArenaHUDProps> = ({
  mode,
  roundNumber,
  currentWord,
  requiredLetter,
  wordHistory,
  players,
  activeUserId,
  myUserId,
  remainingMs,
  totalDurationMs,
  isMyTurn,
  onSubmitWord,
  lastRejectionReason,
  shakeTrigger = 0,
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
  const lastAcceptedBy = players.find((p) => p.userId === activeUserId)?.username;

  return (
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-2 sm:py-6 flex flex-col justify-between min-h-[100dvh] sm:min-h-[calc(100vh-5rem)] gap-2 sm:gap-4 animate-fadeIn">
      {/* Top Navigation / Match Status Bar */}
      <div className="flex items-center justify-between bg-surface/80 border border-slate-800 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent-primary/20 text-indigo-300 border border-accent-primary/30 uppercase">
            {mode} ARENA
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
            Round {roundNumber} • {alivePlayers.length} Alive
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title={isMuted ? 'Unmute Game Sounds' : 'Mute Game Sounds'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>
          <button
            onClick={onLeaveMatch}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition-colors"
            title="Leave Match"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Main Center Stage: Word Display + Authoritative Timer */}
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-5 my-auto py-1 sm:py-3">
        <RadialTimer
          remainingMs={remainingMs}
          totalDurationMs={totalDurationMs}
          isActive={true}
          size={100}
        />

        <CurrentWordDisplay
          currentWord={currentWord}
          requiredLetter={requiredLetter}
          roundNumber={roundNumber}
          wordHistory={wordHistory}
          lastAcceptedByUsername={lastAcceptedBy}
        />
      </div>

      {/* Player Podiums Grid (Responsive 2x2 grid on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {players.map((player) => (
          <PlayerPodium
            key={player.userId}
            player={player}
            isCurrentTurn={player.userId === activeUserId}
            isSelf={player.userId === myUserId}
          />
        ))}
      </div>

      {/* Bottom Area: Docked Word Input or Spectator Mode Banner */}
      <div className="pt-1 sm:pt-2 sticky bottom-0 sm:bottom-4 z-30 pb-safe">
        {isSpectating ? (
          <SpectatorOverlay
            aliveCount={alivePlayers.length}
            totalPlayers={players.length}
            roundNumber={roundNumber}
            onLeaveMatch={onLeaveMatch}
          />
        ) : (
          <div className="bg-surface/95 backdrop-blur-md p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800 shadow-2xl">
            <WordInput
              requiredLetter={requiredLetter}
              isMyTurn={isMyTurn}
              onSubmitWord={onSubmitWord}
              lastRejectionReason={lastRejectionReason}
              shakeTrigger={shakeTrigger}
            />
          </div>
        )}
      </div>
    </div>
  );
};
