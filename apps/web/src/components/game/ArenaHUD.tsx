import { GameLanguage, GameMode, PlayerInGame } from '@wordchain/shared';
import { Flame, History, Volume2, VolumeX, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { soundManager } from '../../utils/sound.js';
import { OpenMicControlBar } from '../voice/OpenMicControlBar.js';
import { CenterWordStage } from './CenterWordStage.js';
import { PlayerPodium } from './PlayerPodium.js';
import { RadialTimer } from './RadialTimer.js';
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
        <div className="lg:col-span-8 flex flex-col items-center justify-center gap-4 w-full">
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
