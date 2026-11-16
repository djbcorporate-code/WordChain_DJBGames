import { ChessGameStateSnapshot, ChessMoveInput, ChessPieceType } from '../types/chess.types.js';
import { applyChessMove, getAllLegalMoves, isCellAttackedByEnemies, LegalChessMove } from './ChessEngine.js';
import { getChessTopology } from './ChessTopologies.js';

const PIECE_VALUE: Record<ChessPieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

/**
 * Fast tactical heuristic bot for 2P / 3P / 4P Chess.
 * Evaluates checkmates, checks, captures (MVV-LVA), hanging risk, promotions, and center control.
 */
export function chooseBestChessMove(state: ChessGameStateSnapshot, seat: number): ChessMoveInput | null {
  const legalMoves = getAllLegalMoves(state, seat);
  if (legalMoves.length === 0) return null;

  const topology = getChessTopology(state.variant);
  const centerCoord = topology.viewBoxSize / 2;

  let bestScore = -Infinity;
  let candidates: LegalChessMove[] = [];

  for (const mv of legalMoves) {
    let score = 0;

    // 1. Capture MVV
    const victim = mv.isEnPassant
      ? mv.enPassantCapturedCellId
        ? state.pieces[mv.enPassantCapturedCellId]
        : undefined
      : state.pieces[mv.to];
    const attacker = state.pieces[mv.from];

    if (victim && attacker) {
      score += PIECE_VALUE[victim.type] * 1.15 - PIECE_VALUE[attacker.type] * 0.1;
    }

    // 2. Promotion value
    if (mv.promotionRequired) {
      score += 820;
    }

    // 3. Castling bonus
    if (mv.isCastle) {
      score += 65;
    }

    // 4. Center proximity bonus
    const destMeta = topology.cellMap.get(mv.to);
    const fromMeta = topology.cellMap.get(mv.from);
    if (destMeta && fromMeta && attacker && attacker.type !== 'K') {
      const distBefore = Math.hypot(fromMeta.center.x - centerCoord, fromMeta.center.y - centerCoord);
      const distAfter = Math.hypot(destMeta.center.x - centerCoord, destMeta.center.y - centerCoord);
      score += (distBefore - distAfter) * 0.08;
    }

    // 5. Quick post-move check & hanging safety evaluation
    const res = applyChessMove(state, seat, {
      from: mv.from,
      to: mv.to,
      promotion: mv.promotionRequired ? 'Q' : undefined,
    });

    if (res.valid && res.nextState) {
      if (res.nextState.winnerSeat === seat) {
        score += 100000;
      } else if (res.eliminatedSeatsThisMove && res.eliminatedSeatsThisMove.length > 0) {
        score += 8000 * res.eliminatedSeatsThisMove.length;
      } else if (res.nextState.inCheckSeats.some((s) => s !== seat)) {
        score += 48;
      }

      // Penalty if destination square is left hanging to an enemy
      if (attacker && attacker.type !== 'K') {
        const postElim = new Set(res.nextState.eliminatedSeats);
        const attackedByEnemy = isCellAttackedByEnemies(topology, res.nextState.pieces, mv.to, seat, postElim);
        if (attackedByEnemy) {
          score -= PIECE_VALUE[attacker.type] * 0.52;
        }
      }
    }

    // Tiny noise for natural variety among equal openings
    score += Math.random() * 6;

    if (score > bestScore) {
      bestScore = score;
      candidates = [mv];
    } else if (Math.abs(score - bestScore) < 1e-6) {
      candidates.push(mv);
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    from: chosen.from,
    to: chosen.to,
    promotion: chosen.promotionRequired ? 'Q' : undefined,
  };
}
