import { SkillActivationPayload } from '@wordchain/shared';
import { RefreshCw, Skull, Sparkles, ZapOff } from 'lucide-react';
import React from 'react';

interface SkillAnimationOverlayProps {
  animation: SkillActivationPayload | null;
  myUserId: string;
}

export const SkillAnimationOverlay: React.FC<SkillAnimationOverlayProps> = ({ animation, myUserId }) => {
  if (!animation) return null;

  const isMeCaster = animation.casterUserId === myUserId;
  const isMeTarget = animation.targetUserId === myUserId;

  return (
    <div className="fixed inset-x-0 top-12 sm:top-16 z-50 pointer-events-none flex items-center justify-center px-4 animate-slideDown">
      {/* 1. CHANGE LETTER ANIMATION */}
      {animation.skillId === 'CHANGE_LETTER' && (
        <div className="w-full max-w-lg bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-emerald-950/95 border-2 border-cyan-400/80 rounded-2xl shadow-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-xl ring-4 ring-cyan-500/20 shadow-cyan-900/50 animate-bounce-subtle">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-glow">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-300" style={{ animationDuration: '3s' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase text-cyan-200">
                {animation.simplified ? '⚡ PREFIX SIMPLIFIED!' : '🎲 LETTER REROLLED!'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {isMeCaster ? 'YOU' : animation.casterUsername}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
              {animation.simplified ? (
                <>
                  Reduced to 1 letter: <strong className="font-mono text-emerald-400 text-lg font-black">&quot;{animation.newRequiredLetter}&quot;</strong>
                </>
              ) : (
                <>
                  New starting letter: <strong className="font-mono text-cyan-300 text-lg font-black">&quot;{animation.newRequiredLetter}&quot;</strong>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. EMP SILENCE ANIMATION */}
      {animation.skillId === 'DISABLE_SKILLS' && (
        <div className="w-full max-w-lg bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400/80 rounded-2xl shadow-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-xl ring-4 ring-amber-500/30 shadow-amber-900/50 animate-shake">
          <div className="w-12 h-12 rounded-xl bg-amber-500/30 text-amber-300 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-glowAmber">
            <ZapOff className="w-6 h-6 animate-pulse text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase text-amber-200">
                ⚡ EMP SILENCE DEPLOYED!
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {isMeCaster ? 'YOU' : animation.casterUsername}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
              All player skills are locked for <strong className="font-mono text-amber-400 font-black">10 SECONDS</strong>!
            </div>
          </div>
        </div>
      )}

      {/* 3. 3-LETTER CURSE ANIMATION */}
      {animation.skillId === 'BURDEN_3_LETTER' && (
        <div
          className={`w-full max-w-lg bg-gradient-to-r from-rose-950/95 via-purple-950/95 to-slate-900/95 border-2 rounded-2xl shadow-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 backdrop-blur-xl animate-pulse ${
            isMeTarget
              ? 'border-rose-400 ring-4 ring-rose-500/40 shadow-rose-900/60'
              : 'border-purple-400/80 ring-2 ring-purple-500/30 shadow-purple-900/50'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/30 text-rose-300 border border-rose-400/50 flex items-center justify-center shrink-0 shadow-glowRose">
            <Skull className="w-6 h-6 animate-bounce text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase text-rose-200">
                {isMeTarget ? '⚠️ 3-LETTER CURSE ON YOU!' : '💀 3-LETTER CURSE INFLICTED!'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                {isMeCaster ? 'YOU' : animation.casterUsername} → {isMeTarget ? 'YOU' : animation.targetUsername || 'Next Player'}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-200 mt-0.5">
              {isMeTarget ? (
                <span className="text-rose-300 font-bold">
                  You must chain a <strong className="underline text-white text-base">3-LETTER</strong> word on your next turn!
                </span>
              ) : (
                <span>
                  <strong>{animation.targetUsername || 'Next player'}</strong> must chain a <strong className="text-rose-300 font-mono">3-LETTER</strong> prefix!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
