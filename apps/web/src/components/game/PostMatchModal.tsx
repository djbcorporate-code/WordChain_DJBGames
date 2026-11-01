import { PlayerInGame } from '@wordchain/shared';
import { ArrowRight, Crown, Medal, Trophy, X } from 'lucide-react';
import React from 'react';
import { RankEmblem } from '../RankEmblem.js';

interface PostMatchModalProps {
  winnerId: string;
  standings: PlayerInGame[];
  onClose: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({ winnerId, standings, onClose }) => {
  const winner = standings.find((p) => p.userId === winnerId) || standings[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Crown & Trophy Header */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-glow mb-3">
            <Trophy className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">Match Completed</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Victory for <span className="text-accent-secondary">{winner?.username}</span>!
          </h2>
        </div>

        {/* Standings Podium List */}
        <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2.5 text-left">
          <div className="text-xs font-mono font-bold uppercase text-slate-400 px-2">Final Standings</div>
          {standings.map((player, idx) => {
            const placement = idx + 1;
            const isWinner = placement === 1;

            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isWinner
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                      isWinner
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : placement === 2
                        ? 'bg-slate-300 text-slate-950'
                        : placement === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{placement}
                  </span>

                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                      <span>{player.username}</span>
                      {isWinner && <Crown className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <span>{player.wordsSubmitted} words submitted</span>
                    </div>
                  </div>
                </div>

                <RankEmblem tier={player.tier} division={player.division} size="sm" showLabel={false} />
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
