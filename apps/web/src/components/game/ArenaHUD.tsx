import { GameLanguage, GameMode, PlayerInGame, SkillActivationPayload, SkillType } from '@wordchain/shared';
import { Flame, History, Volume2, VolumeX, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { TimeAttackAlert } from '../../context/GameContext.js';
import { soundManager } from '../../utils/sound.js';
import { OpenMicControlBar } from '../voice/OpenMicControlBar.js';
import { CenterWordStage } from './CenterWordStage.js';
import { PlayerPodium } from './PlayerPodium.js';
import { PlayerSkillsBar } from './PlayerSkillsBar.js';
import { RadialTimer } from './RadialTimer.js';
import { SkillAnimationOverlay } from './SkillAnimationOverlay.js';
import { SpectatorOverlay } from './SpectatorOverlay.js';
import { WordHistoryPanel } from './WordHistoryPanel.js';

interface ArenaHUDProps {
  mode: GameMode;
  language?: GameLanguage;
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
  timeAttackAlert?: TimeAttackAlert | null;
  activeSkillAnimation?: SkillActivationPayload | null;
  skillsDisabledUntilUtc?: number;
  onUseSkill?: (skillId: SkillType) => void;
  onSubmitWord: (word: string) => void;
  onTypingUpdate?: (suffix: string) => void;
  onLeaveMatch: () => void;
}

export const ArenaHUD: React.FC<ArenaHUDProps> = ({
  mode,
  language,
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
  timeAttackAlert = null,
  activeSkillAnimation = null,
  skillsDisabledUntilUtc = 0,
  onUseSkill = () => {},
  onSubmitWord,
  onTypingUpdate = () => {},
  onLeaveMatch,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // On mobile, auto-close the drawer as soon as it's the user's turn so it never intervenes with typing
  useEffect(() => {
    if (isMyTurn) {
      setShowMobileHistory(false);
    }
  }, [isMyTurn]);

  const myPlayer = players.find((p) => p.userId === myUserId);
  const isSpectating = !myPlayer || !myPlayer.isAlive;
  const alivePlayers = players.filter((p) => p.isAlive);
  const activePlayer = players.find((p) => p.userId === activeUserId);
  const isRound20Plus = roundNumber >= 20;

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex flex-col justify-between min-h-[100dvh] gap-2.5 sm:gap-3.5 animate-fadeIn relative">
      {/* Skill Activation Cinematic Animation Overlay */}
      <SkillAnimationOverlay animation={activeSkillAnimation} myUserId={myUserId} />

      {/* ⚡ High-Impact On-Screen Time Attack Alert Modal Banner */}
      {timeAttackAlert && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-timeAttack w-[92%] sm:w-auto max-w-lg">
          <div
            className={`px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 sm:gap-4 ${
              timeAttackAlert.penalizedUserId === myUserId
                ? 'bg-rose-950/95 border-rose-500/80 text-rose-100 shadow-rose-900/60 ring-2 ring-rose-500/40'
                : timeAttackAlert.attackerUserId === myUserId
                ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-emerald-900/60 ring-2 ring-emerald-500/40'
                : 'bg-amber-950/95 border-amber-500/80 text-amber-100 shadow-amber-900/60 ring-2 ring-amber-500/40'
            }`}
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                timeAttackAlert.penalizedUserId === myUserId
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                  : timeAttackAlert.attackerUserId === myUserId
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                  : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
              }`}
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-current animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs sm:text-sm tracking-wide uppercase">
                  {timeAttackAlert.penaltySec >= 4 ? (
                    timeAttackAlert.penalizedUserId === myUserId
                      ? '⚡ MEGA TIME ATTACK HIT! -4s PENALTY!'
                      : timeAttackAlert.attackerUserId === myUserId
                      ? '⚡ MEGA TIME ATTACK DELIVERED! -4s OPPONENT!'
                      : '⚡ MEGA TIME ATTACK! -4s!'
                  ) : (
                    timeAttackAlert.penalizedUserId === myUserId
                      ? '⚡ TIME ATTACK HIT! -2s PENALTY!'
                      : timeAttackAlert.attackerUserId === myUserId
                      ? '⚡ TIME ATTACK DELIVERED! -2s OPPONENT!'
                      : `⚡ TIME ATTACK! -${timeAttackAlert.penaltySec}s!`
                  )}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 font-bold border border-white/15">
                  {timeAttackAlert.word.length}+ Letters
                </span>
              </div>
              <div className="text-[11px] sm:text-xs opacity-90 font-mono mt-0.5 truncate">
                {timeAttackAlert.penalizedUserId === myUserId ? (
                  <>
                    Opponent played <span className="font-bold underline text-white">{timeAttackAlert.word}</span> (-{timeAttackAlert.penaltySec}s timer!)
                  </>
                ) : timeAttackAlert.attackerUserId === myUserId ? (
                  <>
                    You played <span className="font-bold underline text-white">{timeAttackAlert.word}</span> (-{timeAttackAlert.penaltySec}s to opponent!)
                  </>
                ) : (
                  <>
                    Word played: <span className="font-bold underline text-white">{timeAttackAlert.word}</span> (-{timeAttackAlert.penaltySec}s penalty)
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header: Clean, Uncluttered Arena Navigation */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-mono font-black px-2.5 py-0.5 rounded-lg bg-accent-primary/20 text-indigo-300 border border-accent-primary/30 uppercase tracking-wider flex items-center gap-1.5">
            <span>{mode} ARENA</span>
            {language && language !== 'ENGLISH' && (
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-accent-secondary text-[9px] font-black border border-accent-secondary/40">
                {language === 'TAGALOG' ? '🇵🇭 TAGALOG' : language === 'BISAYA' ? '🇵🇭 BISAYA' : '🌐 MIXED (3 LANGS)'}
              </span>
            )}
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
          {/* Mobile History Drawer Toggle */}
          <button
            onClick={() => setShowMobileHistory((prev) => !prev)}
            className={`lg:hidden p-2 rounded-xl border transition-colors flex items-center gap-1.5 ${
              showMobileHistory
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700/60'
            }`}
            title="Toggle Word History"
          >
            <History className="w-4 h-4" />
            <span className="text-[11px] font-mono font-bold">{wordHistory.length}</span>
          </button>

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

      {/* Open Mic Voice Chat Bar (Casual, Ranked, and Private) */}
      <div className="w-full">
        <OpenMicControlBar compact={true} />
      </div>

      {/* Mobile Non-Intervening Chain Ticker (Directly below header, stays clear of keyboard and stage) */}
      {wordHistory.length > 0 && (
        <div className="lg:hidden w-full flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs font-mono overflow-x-auto no-scrollbar shadow-sm">
          <span className="text-cyan-400 shrink-0 font-bold flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Chain:</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {wordHistory.map((w, idx) => {
              const isLatest = idx === wordHistory.length - 1;
              return (
                <React.Fragment key={`mobile-ticker-${idx}-${w}`}>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isLatest
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                        : 'bg-slate-800/70 text-slate-300 border border-slate-700/40'
                    }`}
                  >
                    {w.toUpperCase()}
                  </span>
                  {idx < wordHistory.length - 1 && (
                    <span className="text-slate-600 text-[10px]">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Arena Area: 12-column Grid on PC (Stage 8 cols, History Sidebar 4 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center my-auto py-1 sm:py-2 w-full">
        {/* Left/Center Area: Radial Timer + CenterWordStage */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center gap-4 w-full relative">
          {/* Floating Time Attack Alert Over Radial Timer */}
          {timeAttackAlert && (
            <div className="absolute -top-3 z-30 animate-timeAttackFloat pointer-events-none">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black tracking-wider flex items-center gap-1 shadow-lg border ${
                  timeAttackAlert.penalizedUserId === myUserId
                    ? 'bg-rose-600/95 text-white border-rose-400 shadow-rose-950/80 animate-pulse'
                    : 'bg-amber-500/95 text-slate-950 border-amber-300 shadow-amber-950/80'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" /> -{timeAttackAlert.penaltySec}s TIME ATTACK!
              </span>
            </div>
          )}

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

          {/* Interactive Player Skills Bar (Change Letter, EMP Silence, 3-Letter Curse) */}
          {!isSpectating && myPlayer && (
            <PlayerSkillsBar
              skills={myPlayer.skills}
              isMyTurn={isMyTurn}
              roundNumber={roundNumber}
              currentPrefix={requiredLetter}
              isSilenced={skillsDisabledUntilUtc ? Date.now() < skillsDisabledUntilUtc : false}
              silenceEndsAtUtc={skillsDisabledUntilUtc}
              onUseSkill={onUseSkill}
            />
          )}
        </div>

        {/* Right Side Area: Word Chain History sidebar for PC users */}
        <div className="hidden lg:flex lg:col-span-4 h-full max-h-[480px] xl:max-h-[540px] flex-col">
          <WordHistoryPanel wordHistory={wordHistory} roundNumber={roundNumber} />
        </div>
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

      {/* Mobile Drawer (Only shown when user taps History on mobile, auto-dismisses when turn starts) */}
      {showMobileHistory && (
        <div
          onClick={() => setShowMobileHistory(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-3 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[70vh] animate-slideUp"
          >
            <WordHistoryPanel
              wordHistory={wordHistory}
              roundNumber={roundNumber}
              isMobileDrawer={true}
              onClose={() => setShowMobileHistory(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
