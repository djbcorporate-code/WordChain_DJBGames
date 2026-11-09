import { PlayerInGame } from '@wordchain/shared';
import { Skull, WifiOff } from 'lucide-react';
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
      className={`relative flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all ${
        isEliminated
          ? 'bg-slate-950/40 border-slate-900/60 opacity-40 grayscale'
          : isCurrentTurn
          ? 'bg-indigo-950/40 border-accent-primary/80 ring-2 ring-accent-primary/40 shadow-glow scale-[1.02]'
          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/70'
      }`}
    >
      {/* Turn indicator glow pill */}
      {isCurrentTurn && !isEliminated && (
        <span className="absolute -top-2 left-3 px-1.5 py-0.2 rounded-full bg-accent-primary text-[9px] font-black uppercase tracking-wider text-white shadow-glow animate-pulse">
          Active
        </span>
      )}

      {/* Avatar + Info */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`relative w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-black text-xs select-none ${
            isEliminated
              ? 'bg-slate-800 text-slate-500'
              : isSelf
              ? 'bg-gradient-to-tr from-accent-primary to-accent-secondary text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-200'
          }`}
        >
          {isEliminated ? (
            <Skull className="w-4 h-4 text-rose-400" />
          ) : (
            player.username.substring(0, 2).toUpperCase()
          )}

          {player.isDisconnected && (
            <div className="absolute -bottom-1 -right-1 p-0.5 bg-rose-500 rounded-full">
              <WifiOff className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[80px] sm:max-w-[120px] ${
                isSelf ? 'text-accent-secondary' : 'text-slate-200'
              }`}
            >
              {player.username}
            </span>
            {isSelf && (
              <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase shrink-0">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <RankEmblem tier={player.tier} division={player.division} size="sm" showLabel={false} />
            <span>{player.wordsSubmitted} words</span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="shrink-0 pl-1">
        {isEliminated ? (
          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
            OUT
          </span>
        ) : isCurrentTurn ? (
          <div className="flex items-center gap-1 text-[10px] font-bold text-accent-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-ping" />
            <span className="hidden xs:inline">Turn</span>
          </div>
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-400/80 inline-block" title="In Game" />
        )}
      </div>
    </div>
  );
};
