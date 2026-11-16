import {
  CHESS_SEAT_META,
  ChessGameStateSnapshot,
  ChessMoveInput,
  ChessPieceType,
  getChessTopology,
  getLegalMovesFromCell,
  LegalChessMove,
} from '@wordchain/shared';
import React, { useMemo, useState } from 'react';
import { ChessPieceGraphic } from './ChessPiecesSvg.js';

interface ChessBoardViewProps {
  gameState: ChessGameStateSnapshot;
  viewerSeat: number;
  interactive: boolean;
  onMove: (move: ChessMoveInput) => void;
  manualRotateDeg?: number;
}

const PROMO_PIECES: { type: ChessPieceType; label: string }[] = [
  { type: 'Q', label: 'Queen' },
  { type: 'R', label: 'Rook' },
  { type: 'B', label: 'Bishop' },
  { type: 'N', label: 'Knight' },
];

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  gameState,
  viewerSeat,
  interactive,
  onMove,
  manualRotateDeg = 0,
}) => {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const topology = useMemo(() => getChessTopology(gameState.variant), [gameState.variant]);
  const seatMetas = CHESS_SEAT_META[gameState.variant];
  const baseRotation = seatMetas[viewerSeat]?.perspectiveDeg ?? 0;
  const totalRotation = baseRotation + manualRotateDeg;
  const vb = topology.viewBoxSize;
  const centerXY = vb / 2;

  const pieceSize =
    gameState.variant === '2P'
      ? 68
      : gameState.variant === '4P'
      ? 43
      : 44;

  const legalMovesForSelected = useMemo<LegalChessMove[]>(() => {
    if (!interactive || !selectedCellId) return [];
    if (gameState.activeSeat !== viewerSeat) return [];
    return getLegalMovesFromCell(gameState, selectedCellId);
  }, [interactive, selectedCellId, gameState, viewerSeat]);

  const legalDestMap = useMemo(() => {
    const m = new Map<string, LegalChessMove>();
    for (const mv of legalMovesForSelected) {
      m.set(mv.to, mv);
    }
    return m;
  }, [legalMovesForSelected]);

  const handleCellClick = (cellId: string) => {
    if (!interactive || gameState.activeSeat !== viewerSeat || gameState.winnerSeat !== undefined || gameState.isDraw) {
      setSelectedCellId(null);
      return;
    }

    // If clicking a valid destination from selected cell
    if (selectedCellId) {
      const chosenMove = legalDestMap.get(cellId);
      if (chosenMove) {
        if (chosenMove.promotionRequired) {
          setPendingPromotion({ from: chosenMove.from, to: chosenMove.to });
          return;
        }
        setSelectedCellId(null);
        onMove({ from: chosenMove.from, to: chosenMove.to });
        return;
      }
    }

    // Toggle/Select own piece
    const clickedPiece = gameState.pieces[cellId];
    if (clickedPiece && clickedPiece.seat === viewerSeat) {
      setSelectedCellId((prev) => (prev === cellId ? null : cellId));
    } else {
      setSelectedCellId(null);
    }
  };

  const handleSelectPromotion = (promoType: ChessPieceType) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    setSelectedCellId(null);
    onMove({ from, to, promotion: promoType });
  };

  const checkedKingCells = useMemo(() => {
    const set = new Set<string>();
    if (!gameState.inCheckSeats.length) return set;
    for (const [cid, p] of Object.entries(gameState.pieces)) {
      if (p.type === 'K' && gameState.inCheckSeats.includes(p.seat)) {
        set.add(cid);
      }
    }
    return set;
  }, [gameState.pieces, gameState.inCheckSeats]);

  const viewerMeta = seatMetas[viewerSeat] || seatMetas[0];

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg
        viewBox={`0 0 ${vb} ${vb}`}
        className="w-full h-full max-w-full max-h-full drop-shadow-2xl"
        role="img"
        aria-label={`${gameState.variant} Multiplayer Chess Board`}
      >
        {/* Outer frame */}
        {gameState.variant === '2P' && (
          <rect x={0} y={0} width={vb} height={vb} rx={12} fill="#334155" stroke="#475569" strokeWidth={4} />
        )}

        <g transform={`rotate(${totalRotation}, ${centerXY}, ${centerXY})`}>
          {topology.cells.map((cell) => {
            const ptsStr = cell.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
            const isSelected = selectedCellId === cell.id;
            const isLastFrom = gameState.lastMove?.from === cell.id;
            const isLastTo = gameState.lastMove?.to === cell.id;
            const isKingChecked = checkedKingCells.has(cell.id);
            const legalDest = legalDestMap.get(cell.id);
            const piece = gameState.pieces[cell.id];

            let fillColor = cell.light ? '#F1F5F9' : '#94A3B8';
            if (isSelected) {
              fillColor = '#22D3EE';
            } else if (isLastFrom || isLastTo) {
              fillColor = cell.light ? '#FEF08A' : '#EAB308';
            }
            if (isKingChecked) {
              fillColor = '#F43F5E';
            }

            const dotR = gameState.variant === '2P' ? 11 : 7.5;
            const capRingR = gameState.variant === '2P' ? 30 : 19;

            return (
              <g
                key={cell.id}
                onClick={() => handleCellClick(cell.id)}
                className={
                  interactive &&
                  gameState.activeSeat === viewerSeat &&
                  ((piece && piece.seat === viewerSeat) || legalDest)
                    ? 'cursor-pointer'
                    : ''
                }
              >
                <polygon
                  points={ptsStr}
                  fill={fillColor}
                  stroke="#475569"
                  strokeWidth={gameState.variant === '2P' ? 1 : 1.4}
                />

                {/* Quiet legal target dot */}
                {legalDest && !piece && (
                  <circle
                    cx={cell.center.x}
                    cy={cell.center.y}
                    r={dotR}
                    fill="#0F172A"
                    fillOpacity={0.32}
                  />
                )}

                {/* Capture or Castling highlight ring */}
                {legalDest && piece && (
                  <circle
                    cx={cell.center.x}
                    cy={cell.center.y}
                    r={capRingR}
                    fill="none"
                    stroke="#0F172A"
                    strokeOpacity={0.55}
                    strokeWidth={3.5}
                  />
                )}

                {/* Piece sprite kept upright inside rotated board */}
                {piece && (
                  <g
                    transform={`translate(${cell.center.x}, ${cell.center.y}) rotate(${-totalRotation})`}
                  >
                    <ChessPieceGraphic type={piece.type} color={piece.color} size={pieceSize} />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Promotion Selection Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm rounded-3xl p-4">
          <div className="bg-surface border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 text-center max-w-xs w-full">
            <h3 className="text-sm sm:text-base font-black text-white">Promote Pawn</h3>
            <p className="text-xs text-slate-400">Choose your replacement piece</p>
            <div className="grid grid-cols-4 gap-2">
              {PROMO_PIECES.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelectPromotion(opt.type)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 transition-all cursor-pointer"
                >
                  <svg viewBox="-25 -25 50 50" className="w-9 h-9">
                    <ChessPieceGraphic type={opt.type} color={viewerMeta.color} size={42} />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-slate-300">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
