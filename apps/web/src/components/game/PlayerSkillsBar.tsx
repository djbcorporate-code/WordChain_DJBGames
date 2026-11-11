import { PlayerSkillState, SkillType } from '@wordchain/shared';
import { Lock, RefreshCw, Skull, Sparkles, Zap, ZapOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface PlayerSkillsBarProps {
  skills?: PlayerSkillState;
  isMyTurn: boolean;
  roundNumber: number;
  currentPrefix: string;
  isSilenced: boolean;
  silenceEndsAtUtc?: number;
  onUseSkill: (skillId: SkillType) => void;
}

export const PlayerSkillsBar: React.FC<PlayerSkillsBarProps> = ({
  skills,
  isMyTurn,
  roundNumber,
  currentPrefix,
  isSilenced,
  silenceEndsAtUtc,
  onUseSkill,
}) => {
  const [silenceRemainingSec, setSilenceRemainingSec] = useState<number>(0);
  const [changeCooldownSec, setChangeCooldownSec] = useState<number>(0);
  const [curseCooldownSec, setCurseCooldownSec] = useState<number>(0);

  // Live countdown ticker for cooldowns and silence duration
  useEffect(() => {
    const tick = () => {
      const now = Date.now();

      // Silence countdown
      if (silenceEndsAtUtc && silenceEndsAtUtc > now) {
        setSilenceRemainingSec(Math.ceil((silenceEndsAtUtc - now) / 1000));
      } else {
        setSilenceRemainingSec(0);
      }

      // Change letter cooldown (10s)
      if (skills?.changeLetterLastUsedUtc) {
        const elapsed = now - skills.changeLetterLastUsedUtc;
        const left = Math.max(0, Math.ceil((10000 - elapsed) / 1000));
        setChangeCooldownSec(left);
      } else {
        setChangeCooldownSec(0);
      }

      // 3-Letter curse cooldown (20s)
      if (skills?.burden3LetterLastUsedUtc) {
        const elapsed = now - skills.burden3LetterLastUsedUtc;
        const left = Math.max(0, Math.ceil((20000 - elapsed) / 1000));
        setCurseCooldownSec(left);
      } else {
        setCurseCooldownSec(0);
      }
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [skills, silenceEndsAtUtc]);

  const isRound20Plus = roundNumber >= 20 || (currentPrefix && currentPrefix.length > 1);
  const usesLeft = skills?.disableSkillsUsesLeft ?? 2;
  const isGlobalSilenced = isSilenced || silenceRemainingSec > 0;

  const canUseChange = isMyTurn && !isGlobalSilenced && changeCooldownSec === 0;
  const canUseSilence = !isGlobalSilenced && usesLeft > 0;
  const canUseCurse = isMyTurn && !isGlobalSilenced && curseCooldownSec === 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-1.5 select-none pt-1">
      {/* Silence Global Alert Banner */}
      {isGlobalSilenced && (
        <div className="flex items-center justify-center gap-2 py-1 px-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-mono font-bold animate-pulse shadow-glowAmber">
          <ZapOff className="w-3.5 h-3.5 text-amber-400" />
          <span>⚡ EMP SILENCE ACTIVE — ALL SKILLS LOCKED ({silenceRemainingSec}s)</span>
        </div>
      )}

      {/* 3 Skill Cards Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Skill 1: Change Letter / Simplify */}
        <button
          type="button"
          onClick={() => {
            if (canUseChange) onUseSkill('CHANGE_LETTER');
          }}
          disabled={!canUseChange}
          className={`relative group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-left overflow-hidden ${
            canUseChange
              ? 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-500/20 active:scale-95 cursor-pointer ring-1 ring-cyan-500/20'
              : 'bg-slate-900/60 text-slate-500 border-slate-800/80 cursor-not-allowed opacity-75'
          }`}
          title={
            !isMyTurn
              ? 'Usable only on your turn'
              : isGlobalSilenced
              ? 'Skills are currently silenced'
              : changeCooldownSec > 0
              ? `Cooldown: ${changeCooldownSec}s`
              : isRound20Plus
              ? 'Simplify prefix to 1 letter!'
              : 'Reroll to a new letter'
          }
        >
          {/* Top Row: Icon + Cooldown Badge */}
          <div className="w-full flex items-center justify-between gap-1 mb-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                canUseChange
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${canUseChange ? 'group-hover:rotate-180 transition-transform duration-500' : ''}`} />
            </div>

            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300/80 border border-slate-700">
              10s CD
            </span>
          </div>

          {/* Skill Title & Subtitle */}
          <div className="w-full">
            <div className="font-black text-xs sm:text-sm tracking-wide text-slate-200 group-hover:text-cyan-300 truncate">
              Change Letter
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono font-semibold mt-0.5 truncate">
              {isRound20Plus ? (
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 inline" /> Simplify to 1!
                </span>
              ) : (
                <span className="text-slate-400">Reroll Letter</span>
              )}
            </div>
          </div>

          {/* Cooldown Overlay */}
          {changeCooldownSec > 0 && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 font-mono font-black text-cyan-300 text-sm">
              <span className="text-base">{changeCooldownSec}s</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Cooldown</span>
            </div>
          )}

          {/* Silence Lock Overlay */}
          {isGlobalSilenced && changeCooldownSec === 0 && (
            <div className="absolute inset-0 bg-amber-950/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 text-amber-300">
              <Lock className="w-4 h-4" />
            </div>
          )}
        </button>

        {/* Skill 2: EMP Silence (usable twice) */}
        <button
          type="button"
          onClick={() => {
            if (canUseSilence) onUseSkill('DISABLE_SKILLS');
          }}
          disabled={!canUseSilence}
          className={`relative group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-left overflow-hidden ${
            canUseSilence
              ? 'bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border-amber-500/50 hover:border-amber-400 shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer ring-1 ring-amber-500/20'
              : 'bg-slate-900/60 text-slate-500 border-slate-800/80 cursor-not-allowed opacity-75'
          }`}
          title={
            usesLeft === 0
              ? 'No uses left (max 2 per match)'
              : isGlobalSilenced
              ? 'Silence is already active'
              : 'Silence all players for 10s'
          }
        >
          {/* Top Row: Icon + Uses Left Badge */}
          <div className="w-full flex items-center justify-between gap-1 mb-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                canUseSilence
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${canUseSilence ? 'animate-pulse' : ''}`} />
            </div>

            <span
              className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded border ${
                usesLeft > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-600 border-slate-700'
              }`}
            >
              {usesLeft}/2 USES
            </span>
          </div>

          {/* Skill Title & Subtitle */}
          <div className="w-full">
            <div className="font-black text-xs sm:text-sm tracking-wide text-slate-200 group-hover:text-amber-300 truncate">
              EMP Silence
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 mt-0.5 truncate">
              Lock All (10s)
            </div>
          </div>

          {/* Silence Lock Overlay */}
          {isGlobalSilenced && (
            <div className="absolute inset-0 bg-amber-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 font-mono font-black text-amber-300 text-sm">
              <Lock className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] uppercase tracking-wider">{silenceRemainingSec}s Left</span>
            </div>
          )}

          {/* Exhausted Overlay */}
          {usesLeft === 0 && !isGlobalSilenced && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 font-mono font-bold text-slate-500 text-xs">
              <span>EXHAUSTED</span>
              <span className="text-[9px] text-slate-600">0 uses left</span>
            </div>
          )}
        </button>

        {/* Special Skill: 3-Letter Curse */}
        <button
          type="button"
          onClick={() => {
            if (canUseCurse) onUseSkill('BURDEN_3_LETTER');
          }}
          disabled={!canUseCurse}
          className={`relative group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all text-left overflow-hidden ${
            canUseCurse
              ? 'bg-gradient-to-b from-rose-950/50 via-slate-900 to-purple-950/50 hover:from-rose-900/60 hover:to-purple-900/60 text-white border-rose-500/60 hover:border-rose-400 shadow-lg hover:shadow-rose-500/30 active:scale-95 cursor-pointer ring-2 ring-rose-500/30'
              : 'bg-slate-900/60 text-slate-500 border-slate-800/80 cursor-not-allowed opacity-75'
          }`}
          title={
            !isMyTurn
              ? 'Usable only on your turn'
              : isGlobalSilenced
              ? 'Skills are currently silenced'
              : curseCooldownSec > 0
              ? `Cooldown: ${curseCooldownSec}s`
              : 'Curse next player with a 3-letter word requirement!'
          }
        >
          {/* Top Row: Icon + SPECIAL Badge */}
          <div className="w-full flex items-center justify-between gap-1 mb-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                canUseCurse
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40 shadow-glowRose'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <Skull className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${canUseCurse ? 'animate-pulse text-rose-400' : ''}`} />
            </div>

            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-sm uppercase tracking-wider">
              SPECIAL
            </span>
          </div>

          {/* Skill Title & Subtitle */}
          <div className="w-full">
            <div className="font-black text-xs sm:text-sm tracking-wide text-rose-200 group-hover:text-rose-300 truncate">
              3-Letter Curse
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono font-semibold text-rose-300/80 mt-0.5 truncate">
              Curse Next Turn
            </div>
          </div>

          {/* Cooldown Overlay */}
          {curseCooldownSec > 0 && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10 font-mono font-black text-rose-400 text-sm">
              <span className="text-base">{curseCooldownSec}s</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Cooldown</span>
            </div>
          )}

          {/* Silence Lock Overlay */}
          {isGlobalSilenced && curseCooldownSec === 0 && (
            <div className="absolute inset-0 bg-amber-950/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 text-amber-300">
              <Lock className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
