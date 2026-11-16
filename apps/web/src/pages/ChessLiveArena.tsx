import { CHESS_SEAT_META, CHESS_VARIANT_LABELS } from '@wordchain/shared';
import {
  AlertTriangle,
  Crown,
  Flag,
  History,
  LogOut,
  RotateCw,
  Skull,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ChessBoardView } from '../components/chess/ChessBoardView.js';
import { PostMatchModal } from '../components/game/PostMatchModal.js';
import { OpenMicControlBar } from '../components/voice/OpenMicControlBar.js';
import { useAuth } from '../context/AuthContext.js';
import { useChessGame } from '../context/ChessGameContext.js';
import { soundManager } from '../utils/sound.js';

function formatClock(ms: number): string {
  const clamped = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ChessLiveArena: React.FC = () => {
  const { user } = useAuth();
  const {
    chessRoom,
    moveError,
    matchWinner,
    makeMove,
    resignMatch,
    leaveRoom,
    resetRematch,
  } = useChessGame();

  const [nowMs, setNowMs] = useState(Date.now());
  const [manualRotateDeg, setManualRotateDeg] = useState(0);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [muted, setMuted] = useState(() => soundManager.getMuted());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  if (!chessRoom || !user) return null;

  const isHost = chessRoom.hostUserId === user.id;
  const gameState = chessRoom.gameState;
  const me = chessRoom.players.find((p) => p.userId === user.id);
  const viewerSeat = me?.seat ?? 0;
  const seatMetas = CHESS_SEAT_META[chessRoom.variant];

  const getDisplayClockMs = (seat: number, baseMs: number): number => {
    if (chessRoom.status !== 'IN_PROGRESS' || !gameState || gameState.activeSeat !== seat || !chessRoom.turnStartedAtUtc) {
      return baseMs;
    }
    const elapsed = Math.max(0, nowMs - chessRoom.turnStartedAtUtc);
    return Math.max(0, baseMs - elapsed);
  };

  const rotateStep = chessRoom.variant === '3P' ? 120 : chessRoom.variant === '4P' ? 90 : 180;
  const activeSeatMeta = gameState ? seatMetas[gameState.activeSeat] : seatMetas[0];
  const isMyTurn = Boolean(me?.isAlive && gameState && gameState.activeSeat === viewerSeat && chessRoom.status === 'IN_PROGRESS');

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Arena HUD */}
      <header className="shrink-0 bg-surface/95 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-black text-xs shrink-0 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            <span>{CHESS_VARIANT_LABELS[chessRoom.variant].split(' ')[0]}</span>
          </div>

          {gameState && (
            <div
              className={`px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 truncate ${
                isMyTurn
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border shrink-0"
                style={{ backgroundColor: activeSeatMeta.fillHex, borderColor: activeSeatMeta.strokeHex }}
              />
              <span className="truncate">
                {isMyTurn ? 'Your Turn!' : `${activeSeatMeta.label} Turn`}
              </span>
            </div>
          )}

          {gameState && gameState.inCheckSeats.length > 0 && (
            <span className="px-2 py-1 rounded-xl bg-rose-500/25 border border-rose-500/50 text-rose-200 font-mono font-black text-[11px] flex items-center gap-1 animate-pulse shrink-0">
              <AlertTriangle className="w-3 h-3" /> CHECK
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setManualRotateDeg((d) => (d + rotateStep) % 360)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Rotate Board"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowMoveLog((s) => !s)}
            className={`p-2 rounded-xl border cursor-pointer lg:hidden ${
              showMoveLog
                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
            title="Move History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setMuted(soundManager.toggleMute())}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {me?.isAlive && chessRoom.status === 'IN_PROGRESS' && (
            confirmResign ? (
              <button
                type="button"
                onClick={() => {
                  resignMatch();
                  setConfirmResign(false);
                }}
                onMouseLeave={() => setConfirmResign(false)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" /> Confirm?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResign(true)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Resign</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={leaveRoom}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Leave Match"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Main Arena Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Players & Chess Clocks Strip (Top on mobile, Left Sidebar on Desktop) */}
        <aside className="shrink-0 lg:w-72 bg-surface/60 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-2 sm:p-3 overflow-x-auto lg:overflow-y-auto">
          <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            {chessRoom.players.map((p) => {
              const sMeta = seatMetas[p.seat];
              const isActive = chessRoom.status === 'IN_PROGRESS' && gameState?.activeSeat === p.seat;
              const isMe = p.userId === user.id;
              const inCheck = gameState?.inCheckSeats.includes(p.seat);
              const dispMs = getDisplayClockMs(p.seat, p.timeRemainingMs);
              const isLow = isActive && dispMs <= 30000;

              return (
                <div
                  key={p.userId}
                  className={`rounded-2xl border px-3 py-2 sm:py-2.5 transition-all flex items-center justify-between gap-3 ${
                    !p.isAlive
                      ? 'bg-slate-950/60 border-slate-800/70 opacity-50'
                      : isActive
                      ? 'bg-emerald-500/15 border-emerald-400 shadow-glow'
                      : isMe
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border shrink-0"
                      style={{ backgroundColor: sMeta.fillHex, borderColor: sMeta.strokeHex }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs sm:text-sm text-white truncate max-w-[115px] lg:max-w-none">
                        <span className="truncate">{p.username}</span>
                        {isMe && <span className="text-[9px] font-mono text-cyan-300">(YOU)</span>}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span>{sMeta.label}</span>
                        {inCheck && <span className="text-rose-400 font-black">IN CHECK</span>}
                        {!p.isAlive && (
                          <span className="text-rose-300 flex items-center gap-0.5">
                            <Skull className="w-3 h-3" /> #{p.placement}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs sm:text-sm shrink-0 ${
                      !p.isAlive
                        ? 'bg-slate-900 text-slate-500'
                        : isLow
                        ? 'bg-rose-500/25 text-rose-200 animate-pulse border border-rose-500/40'
                        : isActive
                        ? 'bg-slate-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950/70 text-slate-300'
                    }`}
                  >
                    {formatClock(dispMs)}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Board Stage */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 sm:p-5 relative overflow-hidden">
          {chessRoom.status === 'COUNTDOWN' ? (
            <div className="text-center space-y-3 animate-fadeIn p-8 rounded-3xl bg-card border border-slate-800 shadow-2xl">
              <Zap className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-2xl sm:text-4xl font-black text-white">Chess Match Starting!</h2>
              <p className="text-sm text-slate-400">
                {CHESS_VARIANT_LABELS[chessRoom.variant]} · {Math.round(chessRoom.clockSec / 60)}m + {chessRoom.incrementSec}s
              </p>
            </div>
          ) : gameState ? (
            <div className="w-full h-full flex items-center justify-center">
              <ChessBoardView
                gameState={gameState}
                viewerSeat={viewerSeat}
                interactive={chessRoom.status === 'IN_PROGRESS' && Boolean(me?.isAlive)}
                onMove={makeMove}
                manualRotateDeg={manualRotateDeg}
              />
            </div>
          ) : null}

          {moveError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-rose-600/90 text-white text-xs font-bold shadow-lg animate-fadeIn">
              {moveError}
            </div>
          )}
        </main>

        {/* Right Move History Sidebar (Desktop always, Mobile slide-up drawer when toggled) */}
        <aside
          className={`${
            showMoveLog ? 'flex fixed inset-x-0 bottom-12 top-16 z-30 bg-surface/95 backdrop-blur-md' : 'hidden'
          } lg:flex lg:static lg:w-72 flex-col bg-surface/60 border-l border-slate-800/80 p-3 min-h-0`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 shrink-0">
            <span className="text-xs font-mono font-black uppercase text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              Move History ({gameState?.moveHistory.length || 0})
            </span>
            {showMoveLog && (
              <button
                onClick={() => setShowMoveLog(false)}
                className="lg:hidden text-xs font-bold text-slate-400 hover:text-white px-2 py-1"
              >
                Close
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
            {(!gameState || gameState.moveHistory.length === 0) ? (
              <p className="text-slate-500 text-center py-6">No moves played yet.</p>
            ) : (
              [...gameState.moveHistory].reverse().map((m) => {
                const sMeta = seatMetas[m.seat];
                return (
                  <div
                    key={m.moveNumber}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">#{m.moveNumber}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full border shrink-0"
                        style={{ backgroundColor: sMeta.fillHex, borderColor: sMeta.strokeHex }}
                      />
                      <span className="text-slate-300">{sMeta.label}</span>
                    </div>
                    <span className="font-black text-white">{m.notation}</span>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Voice Chat Footer */}
      <footer className="shrink-0 bg-surface/90 border-t border-slate-800 px-3 sm:px-6 py-1.5">
        <div className="max-w-4xl mx-auto">
          <OpenMicControlBar compact={true} />
        </div>
      </footer>

      {/* Post-Match Podium Modal */}
      {chessRoom.status === 'FINISHED' && matchWinner && (
        <PostMatchModal
          winnerId={matchWinner.winnerId}
          standings={matchWinner.standings}
          deltas={matchWinner.deltas}
          mode={chessRoom.mode}
          isDraw={matchWinner.isDraw}
          isHost={isHost}
          onRematch={chessRoom.mode === 'PRIVATE' && isHost ? resetRematch : undefined}
          onClose={leaveRoom}
        />
      )}
    </div>
  );
};
