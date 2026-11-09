import {
  PlayerInGame,
  RANK_TIER_CONFIGS,
  RankProgressionDelta,
} from '@wordchain/shared';
import {
  ArrowRight,
  ArrowUpCircle,
  Crown,
  Medal,
  Shield,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { RankEmblem } from '../RankEmblem.js';

interface PostMatchModalProps {
  winnerId: string;
  standings: PlayerInGame[];
  deltas?: Record<string, RankProgressionDelta>;
  mode?: string;
  isHost?: boolean;
  onRematch?: () => void;
  onClose: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  winnerId,
  standings,
  deltas,
  mode,
  isHost,
  onRematch,
  onClose,
}) => {
  const { user } = useAuth();
  const winner = standings.find((p) => p.userId === winnerId) || standings[0];
  const myDelta = user?.id && deltas ? deltas[user.id] : undefined;

  const prevConfig = myDelta ? RANK_TIER_CONFIGS[myDelta.previousTier] : null;
  const newConfig = myDelta ? RANK_TIER_CONFIGS[myDelta.newTier] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center my-8">
        {/* Crown & Trophy Header */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-glow mb-3">
            <Trophy className="w-8 h-8 text-slate-950 fill-current" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
            Match Completed
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Victory for <span className="text-accent-secondary">{winner?.username}</span>!
          </h2>
        </div>

        {/* Scholar Personal Progression Card */}
        {myDelta && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Your Academic Progression
              </span>

              {/* Status Badge */}
              {myDelta.promoted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <ArrowUpCircle className="w-3.5 h-3.5" /> PROMOTION ACHIEVED!
                </span>
              )}
              {myDelta.demoted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  DEMOTED
                </span>
              )}
              {!myDelta.promoted && !myDelta.demoted && prevConfig?.demotionProtected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Shield className="w-3 h-3" /> Demotion Protected
                </span>
              )}
            </div>

            {/* Emblem & Division comparison */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <RankEmblem
                  tier={myDelta.newTier}
                  division={myDelta.newDivision}
                  scientistPoints={myDelta.newScientistPoints}
                  size="md"
                />
              </div>

              {/* EXP / Point Changes */}
              <div className="text-right">
                {myDelta.newTier === 'SCIENTIST' ? (
                  <div>
                    <span
                      className={`text-lg font-black font-mono ${
                        myDelta.pointsChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {myDelta.pointsChange >= 0 ? `+${myDelta.pointsChange}` : myDelta.pointsChange} SP
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {myDelta.newScientistPoints} Scientist Points
                    </div>
                  </div>
                ) : (
                  <div>
                    <span
                      className={`text-lg font-black font-mono ${
                        myDelta.expChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {myDelta.expChange >= 0 ? `+${myDelta.expChange}` : myDelta.expChange} EXP
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {myDelta.newExp} / {newConfig?.expPerDivision || 100} EXP
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rank EXP progress bar (for non-scientist) */}
            {myDelta.newTier !== 'SCIENTIST' && newConfig && (
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-700 rounded-full"
                  style={{
                    width: `${Math.min(100, (myDelta.newExp / newConfig.expPerDivision) * 100)}%`,
                  }}
                />
              </div>
            )}

            {/* Account XP reward */}
            {myDelta.accountXpEarned !== undefined && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80 font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-secondary" /> Account XP Earned
                </span>
                <span className="font-bold text-slate-200">
                  +{myDelta.accountXpEarned} XP
                  {myDelta.newAccountLevel && ` (Lvl ${myDelta.newAccountLevel})`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Standings Podium List */}
        <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2.5 text-left">
          <div className="text-xs font-mono font-bold uppercase text-slate-400 px-2">
            Final Standings
          </div>
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

                <RankEmblem
                  tier={player.tier}
                  division={player.division}
                  size="sm"
                  showLabel={false}
                />
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {mode === 'PRIVATE' && onRematch && isHost && (
            <button
              onClick={onRematch}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Play Again (Return Room to Lobby)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {mode === 'PRIVATE' && !isHost && (
            <div className="text-xs text-indigo-300 font-mono py-1">
              Waiting for Room Creator to initiate rematch...
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'PRIVATE' && isHost
                ? 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80'
                : 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-glow hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            <span>{mode === 'PRIVATE' ? 'Leave Room & Exit' : 'Return to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
