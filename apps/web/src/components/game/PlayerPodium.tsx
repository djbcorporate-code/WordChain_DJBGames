import { PlayerInGame } from '@wordchain/shared';
import { Skull, Trophy, WifiOff } from 'lucide-react';
import React from 'react';
import { RankEmblem } from '../RankEmblem.js';

interface PlayerPodiumProps {
  player: PlayerInGame;
  isCurrentTurn: boolean;
  isSelf: boolean;
}

export const PlayerPodium: React.FC<PlayerPodiumProps> = ({
  player,
  isCurrentTurn,
  isSelf,
}) => {
  const isEliminated = !player.isAlive;

  return (
    <div
      className={`relative flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
        isEliminated
          ? 'bg-slate-950/60 border-slate-900 opacity-50 grayscale'
          : isCurrentTurn
          ? 'bg-surface border-accent-primary ring-2 ring-accent-primary/40 shadow-glow scale-[1.01]'
          : 'bg-card border-slate-800'
      }`}
    >
      {/* Turn indicator glow pill */}
      {isCurrentTurn && !isEliminated && (
        <span className="absolute -top-2 left-2 sm:left-4 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-accent-primary text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-glow animate-pulse">
          Turn
        </span>
      )}

      {/* Left side: Avatar + Username + Rank */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div
          className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center font-black text-xs sm:text-sm select-none ${
            isEliminated
              ? 'bg-slate-800 text-slate-500'
              : isSelf
              ? 'bg-gradient-to-tr from-accent-primary to-accent-secondary text-white'
              : 'bg-slate-800 text-slate-200'
          }`}
        >
          {isEliminated ? (
            <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
          ) : (
            player.username.substring(0, 2).toUpperCase()
          )}

          {player.isDisconnected && (
            <div className="absolute -bottom-1 -right-1 p-0.5 bg-rose-500 rounded-full" title="Player disconnected">
              <WifiOff className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[65px] xs:max-w-[95px] sm:max-w-none ${isSelf ? 'text-accent-secondary' : 'text-slate-100'}`}>
              {player.username}
            </span>
            {isSelf && (
              <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase shrink-0">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <RankEmblem tier={player.tier} division={player.division} size="sm" showLabel={false} />
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0">
              {player.wordsSubmitted}w
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Placement or Status */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 pl-1">
        {isEliminated ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] sm:text-xs font-mono font-bold text-rose-400">OUT</span>
            {player.placement && (
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">#{player.placement}</span>
            )}
          </div>
        ) : isCurrentTurn ? (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-secondary animate-ping" />
            <span className="text-[10px] sm:text-xs font-bold text-accent-secondary uppercase tracking-wider hidden xs:inline">
              Thinking
            </span>
          </div>
        ) : (
          <span className="text-[9px] sm:text-xs font-semibold text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Alive
          </span>
        )}
      </div>
    </div>
  );
};
