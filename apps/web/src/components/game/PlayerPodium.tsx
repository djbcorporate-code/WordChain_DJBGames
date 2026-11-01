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
      className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
        isEliminated
          ? 'bg-slate-950/60 border-slate-900 opacity-50 grayscale'
          : isCurrentTurn
          ? 'bg-surface border-accent-primary ring-2 ring-accent-primary/40 shadow-glow scale-[1.02]'
          : 'bg-card border-slate-800'
      }`}
    >
      {/* Turn indicator glow pill */}
      {isCurrentTurn && !isEliminated && (
        <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-accent-primary text-[10px] font-black uppercase tracking-wider text-white shadow-glow animate-pulse">
          Active Turn
        </span>
      )}

      {/* Left side: Avatar + Username + Rank */}
      <div className="flex items-center gap-2.5">
        <div
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm select-none ${
            isEliminated
              ? 'bg-slate-800 text-slate-500'
              : isSelf
              ? 'bg-gradient-to-tr from-accent-primary to-accent-secondary text-white'
              : 'bg-slate-800 text-slate-200'
          }`}
        >
          {isEliminated ? (
            <Skull className="w-5 h-5 text-rose-400" />
          ) : (
            player.username.substring(0, 2).toUpperCase()
          )}

          {player.isDisconnected && (
            <div className="absolute -bottom-1 -right-1 p-0.5 bg-rose-500 rounded-full" title="Player disconnected">
              <WifiOff className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm tracking-tight ${isSelf ? 'text-accent-secondary' : 'text-slate-100'}`}>
              {player.username}
            </span>
            {isSelf && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <RankEmblem tier={player.tier} division={player.division} size="sm" showLabel={false} />
            <span className="text-[11px] text-slate-400 font-mono">
              {player.wordsSubmitted} {player.wordsSubmitted === 1 ? 'word' : 'words'}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Placement or Status */}
      <div className="flex items-center gap-2">
        {isEliminated ? (
          <div className="flex flex-col items-end">
            <span className="text-xs font-mono font-bold text-rose-400">ELIMINATED</span>
            {player.placement && (
              <span className="text-[10px] text-slate-500 font-mono">#{player.placement} Place</span>
            )}
          </div>
        ) : isCurrentTurn ? (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-secondary animate-ping" />
            <span className="text-xs font-bold text-accent-secondary uppercase tracking-wider hidden sm:inline">
              Thinking
            </span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Alive
          </span>
        )}
      </div>
    </div>
  );
};
