import {
  applyChessMove,
  CHESS_CLOCK_PRESETS_SEC,
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_SEAT_META,
  CHESS_VARIANT_LABELS,
  ChessGameStateSnapshot,
  ChessMoveInput,
  ChessVariant,
  chooseBestChessMove,
  createInitialChessState,
  eliminateSeatFromState,
} from '@wordchain/shared';
import { ArrowLeft, Bot, Crown, Flag, Play, RotateCcw, RotateCw, Skull, Trophy } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ChessBoardView } from '../components/chess/ChessBoardView.js';
import { soundManager } from '../utils/sound.js';

interface ChessPracticeArenaProps {
  onExit: () => void;
}

function formatClock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

export const ChessPracticeArena: React.FC<ChessPracticeArenaProps> = ({ onExit }) => {
  const [variant, setVariant] = useState<ChessVariant>('4P');
  const [clockSec, setClockSec] = useState<number>(CHESS_DEFAULT_CLOCK_SEC);
  const [phase, setPhase] = useState<'SETUP' | 'PLAYING' | 'FINISHED'>('SETUP');
  const [gameState, setGameState] = useState<ChessGameStateSnapshot | null>(null);
  const [clocksMs, setClocksMs] = useState<number[]>([]);
  const [turnStartMs, setTurnStartMs] = useState<number>(Date.now());
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [manualRotateDeg, setManualRotateDeg] = useState(0);

  const botTimeoutRef = useRef<number | null>(null);
  const clearBotTimer = () => {
    if (botTimeoutRef.current !== null) {
      window.clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearBotTimer(), []);

  useEffect(() => {
    if (phase !== 'PLAYING' || !gameState) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNowMs(t);

      // Flag check for active seat
      const active = gameState.activeSeat;
      const elapsed = Math.max(0, t - turnStartMs);
      if (clocksMs[active] !== undefined && clocksMs[active] - elapsed <= 0) {
        clearBotTimer();
        setClocksMs((prev) => prev.map((v, i) => (i === active ? 0 : v)));
        const next = eliminateSeatFromState(gameState, active);
        setGameState(next);
        setTurnStartMs(t);
        soundManager.playEliminated();
        if (next.winnerSeat !== undefined || next.isDraw) {
          setPhase('FINISHED');
          soundManager.playVictory();
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, gameState, turnStartMs, clocksMs]);

  // Bot turn scheduler (Human is always Seat 0; Seats 1..N-1 are AI Bots)
  useEffect(() => {
    clearBotTimer();
    if (phase !== 'PLAYING' || !gameState) return;
    if (gameState.winnerSeat !== undefined || gameState.isDraw) {
      setPhase('FINISHED');
      return;
    }
    if (gameState.activeSeat === 0) return;

    const botSeat = gameState.activeSeat;
    botTimeoutRef.current = window.setTimeout(() => {
      const move = chooseBestChessMove(gameState, botSeat);
      if (move) {
        executeMove(botSeat, move);
      }
    }, 750);

    return () => clearBotTimer();
  }, [phase, gameState?.turnCount, gameState?.activeSeat]);

  const startPractice = () => {
    clearBotTimer();
    const initial = createInitialChessState(variant);
    const totalSeats = CHESS_SEAT_META[variant].length;
    setClocksMs(Array.from({ length: totalSeats }, () => clockSec * 1000));
    setGameState(initial);
    setTurnStartMs(Date.now());
    setNowMs(Date.now());
    setManualRotateDeg(0);
    setPhase('PLAYING');
    soundManager.playTurnStart();
  };

  const executeMove = (seat: number, move: ChessMoveInput) => {
    if (!gameState) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - turnStartMs);

    const res = applyChessMove(gameState, seat, move);
    if (!res.valid || !res.nextState) return;

    setClocksMs((prev) =>
      prev.map((ms, idx) => (idx === seat ? Math.max(100, ms - elapsed + 3000) : ms))
    );
    setGameState(res.nextState);
    setTurnStartMs(now);
    setNowMs(now);

    if (res.nextState.inCheckSeats.length > 0) {
      soundManager.playTimerUrgent();
    } else if (res.moveRecord?.captured) {
      soundManager.playWordAccepted();
    } else {
      soundManager.playTurnStart();
    }

    if (res.nextState.winnerSeat !== undefined || res.nextState.isDraw) {
      setPhase('FINISHED');
      soundManager.playVictory();
    }
  };

  const handleHumanResign = () => {
    if (!gameState || phase !== 'PLAYING') return;
    clearBotTimer();
    const next = eliminateSeatFromState(gameState, 0);
    setGameState(next);
    setPhase('FINISHED');
  };

  const seatMetas = CHESS_SEAT_META[variant];
  const rotateStep = variant === '3P' ? 120 : variant === '4P' ? 90 : 180;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-surface border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              clearBotTimer();
              onExit();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit
          </button>
          <span className="font-black text-sm sm:text-base text-emerald-300 flex items-center gap-1.5">
            <Crown className="w-4 h-4" /> Chess Practice ({variant})
          </span>
        </div>

        {phase === 'PLAYING' && gameState && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualRotateDeg((d) => (d + rotateStep) % 360)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Rotate Board"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleHumanResign}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" /> Resign
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden">
        {phase === 'SETUP' && (
          <div className="w-full max-w-md bg-card border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 mx-auto">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Chess Practice Arena</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Play 2-Player Classic, 3-Player Hex, or 4-Player Cross Chess offline against AI opponents.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Select Board Size
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['2P', '3P', '4P'] as ChessVariant[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      variant === v
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{CHESS_VARIANT_LABELS[v]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Chess Clock (+3s/move)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHESS_CLOCK_PRESETS_SEC.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setClockSec(sec)}
                    className={`py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                      clockSec === sec
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec / 60} min
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startPractice}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-glow cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> Start Practice Match
            </button>
          </div>
        )}

        {(phase === 'PLAYING' || phase === 'FINISHED') && gameState && (
          <div className="w-full h-full max-w-6xl flex flex-col lg:flex-row items-center gap-3 min-h-0">
            {/* Compact Seat Status Strip */}
            <div className="shrink-0 flex lg:flex-col gap-2 overflow-x-auto max-w-full lg:w-64">
              {seatMetas.map((meta) => {
                const elim = gameState.eliminatedSeats.includes(meta.seat);
                const isActive = phase === 'PLAYING' && gameState.activeSeat === meta.seat;
                const isCheck = gameState.inCheckSeats.includes(meta.seat);
                const baseMs = clocksMs[meta.seat] ?? clockSec * 1000;
                const dispMs = isActive ? Math.max(0, baseMs - Math.max(0, nowMs - turnStartMs)) : baseMs;

                return (
                  <div
                    key={meta.seat}
                    className={`px-3 py-2 rounded-2xl border flex items-center justify-between gap-2 shrink-0 ${
                      elim
                        ? 'bg-slate-950/60 border-slate-800/60 opacity-45'
                        : isActive
                        ? 'bg-emerald-500/15 border-emerald-400'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border shrink-0"
                        style={{ backgroundColor: meta.fillHex, borderColor: meta.strokeHex }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {meta.seat === 0 ? 'You' : `Bot ${meta.label}`}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {meta.label}
                          {isCheck ? ' · CHECK!' : ''}
                          {elim ? ' · Out' : ''}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-black text-xs text-emerald-300">
                      {elim ? <Skull className="w-3.5 h-3.5 text-rose-400" /> : formatClock(dispMs)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Board */}
            <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
              <ChessBoardView
                gameState={gameState}
                viewerSeat={0}
                interactive={phase === 'PLAYING'}
                onMove={(mv) => executeMove(0, mv)}
                manualRotateDeg={manualRotateDeg}
              />

              {phase === 'FINISHED' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm rounded-3xl p-4">
                  <div className="bg-card border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                    <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
                    <h2 className="text-2xl font-black text-white">
                      {gameState.isDraw
                        ? 'Draw Match!'
                        : gameState.winnerSeat === 0
                        ? 'Victory!'
                        : `${seatMetas[gameState.winnerSeat!]?.label || 'Opponent'} Wins!`}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={startPractice}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" /> Rematch
                      </button>
                      <button
                        onClick={() => setPhase('SETUP')}
                        className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
                      >
                        Change Board
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
