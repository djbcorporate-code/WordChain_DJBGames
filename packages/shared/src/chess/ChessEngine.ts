import {
  ChessEnPassantTarget,
  ChessGameStateSnapshot,
  ChessMoveInput,
  ChessMoveRecord,
  ChessPiece,
  ChessPieceType,
  ChessVariant,
} from '../types/chess.types.js';
import { BoardTopology, Dir4, getChessTopology } from './ChessTopologies.js';

export interface LegalChessMove {
  from: string;
  to: string;
  promotionRequired?: boolean;
  isCastle?: boolean;
  castleRookFrom?: string;
  castleRookTo?: string;
  isEnPassant?: boolean;
  enPassantCapturedCellId?: string;
  enPassantRegisterTargetId?: string;
}

export interface MoveValidationResult {
  valid: boolean;
  reason?: string;
  nextState?: ChessGameStateSnapshot;
  moveRecord?: ChessMoveRecord;
  eliminatedSeatsThisMove?: number[];
}

function pairKey(a: Dir4, b: Dir4): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function clonePieces(pieces: Record<string, ChessPiece>): Record<string, ChessPiece> {
  const copy: Record<string, ChessPiece> = {};
  for (const [k, p] of Object.entries(pieces)) {
    copy[k] = { ...p };
  }
  return copy;
}

function stepKnightUnion(topology: BoardTopology, fromId: string): string[] {
  const targets = new Set<string>();
  const startLinks = topology.edgeSteps.get(fromId);
  if (!startLinks) return [];

  for (let d = 0 as Dir4; d < 4; d = (d + 1) as Dir4) {
    const s1 = startLinks[d];
    if (!s1) continue;

    const dAfter1 = s1.mapDir[d];
    const pLeftAfter1 = s1.mapDir[((d + 3) % 4) as Dir4];
    const pRightAfter1 = s1.mapDir[((d + 1) % 4) as Dir4];

    // Variant A: 2 straight along initial direction, then 1 perpendicular turn
    const s2Straight = topology.edgeSteps.get(s1.nextCellId)?.[dAfter1];
    if (s2Straight) {
      const pLeft2 = s2Straight.mapDir[pLeftAfter1];
      const pRight2 = s2Straight.mapDir[pRightAfter1];
      const links2 = topology.edgeSteps.get(s2Straight.nextCellId);
      if (links2?.[pLeft2]) targets.add(links2[pLeft2]!.nextCellId);
      if (links2?.[pRight2]) targets.add(links2[pRight2]!.nextCellId);
    }

    // Variant B: 1 straight, turn perpendicular, then 2 straight (ensures symmetry across 3P center rosette)
    for (const perpDir of [pLeftAfter1, pRightAfter1]) {
      const sTurn1 = topology.edgeSteps.get(s1.nextCellId)?.[perpDir];
      if (!sTurn1) continue;
      const mappedTurn = sTurn1.mapDir[perpDir];
      const sTurn2 = topology.edgeSteps.get(sTurn1.nextCellId)?.[mappedTurn];
      if (sTurn2) {
        targets.add(sTurn2.nextCellId);
      }
    }
  }

  targets.delete(fromId);
  return Array.from(targets);
}

function generateSlidingEdgeTargets(
  topology: BoardTopology,
  pieces: Record<string, ChessPiece>,
  fromId: string,
  ownerSeat: number
): string[] {
  const out: string[] = [];
  const startLinks = topology.edgeSteps.get(fromId);
  if (!startLinks) return out;

  for (let d = 0 as Dir4; d < 4; d = (d + 1) as Dir4) {
    let link = startLinks[d];
    let dir = d;
    const visited = new Set<string>([fromId]);

    while (link) {
      const currId = link.nextCellId;
      if (visited.has(currId)) break;
      visited.add(currId);

      const occupant = pieces[currId];
      if (occupant) {
        if (occupant.seat !== ownerSeat) {
          out.push(currId);
        }
        break;
      }

      out.push(currId);
      dir = link.mapDir[dir];
      link = topology.edgeSteps.get(currId)?.[dir];
    }
  }

  return out;
}

function generateSlidingDiagTargets(
  topology: BoardTopology,
  pieces: Record<string, ChessPiece>,
  fromId: string,
  ownerSeat: number
): string[] {
  const out = new Set<string>();
  const startDiag = topology.diagSteps.get(fromId);
  if (!startDiag) return [];

  const queue: { cellId: string; a: Dir4; b: Dir4; visited: Set<string> }[] = [];
  for (const pair of [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 3],
  ] as [Dir4, Dir4][]) {
    const targets = startDiag.get(pairKey(pair[0], pair[1])) || [];
    for (const t of targets) {
      queue.push({
        cellId: t.nextCellId,
        a: t.nextAxes[0],
        b: t.nextAxes[1],
        visited: new Set([fromId]),
      });
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.visited.has(node.cellId)) continue;
    node.visited.add(node.cellId);

    const occupant = pieces[node.cellId];
    if (occupant) {
      if (occupant.seat !== ownerSeat) {
        out.add(node.cellId);
      }
      continue;
    }

    out.add(node.cellId);
    const nextMap = topology.diagSteps.get(node.cellId);
    if (!nextMap) continue;
    const continuations = nextMap.get(pairKey(node.a, node.b)) || [];
    for (const nextStep of continuations) {
      if (!node.visited.has(nextStep.nextCellId)) {
        queue.push({
          cellId: nextStep.nextCellId,
          a: nextStep.nextAxes[0],
          b: nextStep.nextAxes[1],
          visited: new Set(node.visited),
        });
      }
    }
  }

  return Array.from(out);
}

/**
 * Checks whether `cellId` is attacked by any surviving piece belonging to a seat !== `defenderSeat`.
 */
export function isCellAttackedByEnemies(
  topology: BoardTopology,
  pieces: Record<string, ChessPiece>,
  cellId: string,
  defenderSeat: number,
  eliminatedSet: Set<number>
): boolean {
  // 1. Sliding edge rays (enemy Rooks / Queens, and distance-1 enemy Kings)
  const startLinks = topology.edgeSteps.get(cellId);
  if (startLinks) {
    for (let d = 0 as Dir4; d < 4; d = (d + 1) as Dir4) {
      let link = startLinks[d];
      let dir = d;
      let dist = 1;
      const visited = new Set<string>([cellId]);

      while (link) {
        const currId = link.nextCellId;
        if (visited.has(currId)) break;
        visited.add(currId);

        const occ = pieces[currId];
        if (occ) {
          if (occ.seat !== defenderSeat && !eliminatedSet.has(occ.seat)) {
            if (occ.type === 'R' || occ.type === 'Q' || (dist === 1 && occ.type === 'K')) {
              return true;
            }
          }
          break;
        }

        dir = link.mapDir[dir];
        link = topology.edgeSteps.get(currId)?.[dir];
        dist++;
      }
    }
  }

  // 2. Sliding diagonal rays (enemy Bishops / Queens, and distance-1 enemy Kings)
  const startDiag = topology.diagSteps.get(cellId);
  if (startDiag) {
    const queue: { cellId: string; a: Dir4; b: Dir4; dist: number; visited: Set<string> }[] = [];
    for (const pair of [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
    ] as [Dir4, Dir4][]) {
      for (const step of startDiag.get(pairKey(pair[0], pair[1])) || []) {
        queue.push({
          cellId: step.nextCellId,
          a: step.nextAxes[0],
          b: step.nextAxes[1],
          dist: 1,
          visited: new Set([cellId]),
        });
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node.visited.has(node.cellId)) continue;
      node.visited.add(node.cellId);

      const occ = pieces[node.cellId];
      if (occ) {
        if (occ.seat !== defenderSeat && !eliminatedSet.has(occ.seat)) {
          if (occ.type === 'B' || occ.type === 'Q' || (node.dist === 1 && occ.type === 'K')) {
            return true;
          }
        }
        continue;
      }

      const nextMap = topology.diagSteps.get(node.cellId);
      if (!nextMap) continue;
      for (const cont of nextMap.get(pairKey(node.a, node.b)) || []) {
        if (!node.visited.has(cont.nextCellId)) {
          queue.push({
            cellId: cont.nextCellId,
            a: cont.nextAxes[0],
            b: cont.nextAxes[1],
            dist: node.dist + 1,
            visited: new Set(node.visited),
          });
        }
      }
    }
  }

  // 3. Enemy Knights
  for (const knCellId of stepKnightUnion(topology, cellId)) {
    const occ = pieces[knCellId];
    if (occ && occ.seat !== defenderSeat && !eliminatedSet.has(occ.seat) && occ.type === 'N') {
      return true;
    }
  }

  // 4. Enemy Pawns (check whether any surviving enemy pawn on the board attacks `cellId`)
  for (const [pCellId, occ] of Object.entries(pieces)) {
    if (occ.type === 'P' && occ.seat !== defenderSeat && !eliminatedSet.has(occ.seat)) {
      if (topology.getPawnCaptureTargets(pCellId, occ.seat).includes(cellId)) {
        return true;
      }
    }
  }

  return false;
}

export function isSeatInCheckWithPieces(
  topology: BoardTopology,
  pieces: Record<string, ChessPiece>,
  seat: number,
  eliminatedSet: Set<number>
): boolean {
  let kingCellId: string | undefined;
  for (const [cid, p] of Object.entries(pieces)) {
    if (p.seat === seat && p.type === 'K') {
      kingCellId = cid;
      break;
    }
  }
  if (!kingCellId) return false;
  return isCellAttackedByEnemies(topology, pieces, kingCellId, seat, eliminatedSet);
}

export function isSeatInCheck(state: ChessGameStateSnapshot, seat: number): boolean {
  const topology = getChessTopology(state.variant);
  return isSeatInCheckWithPieces(topology, state.pieces, seat, new Set(state.eliminatedSeats));
}

function getPseudoLegalMovesForCell(
  topology: BoardTopology,
  pieces: Record<string, ChessPiece>,
  enPassantTargets: ChessEnPassantTarget[],
  eliminatedSet: Set<number>,
  fromId: string
): LegalChessMove[] {
  const piece = pieces[fromId];
  if (!piece) return [];

  const moves: LegalChessMove[] = [];
  const seat = piece.seat;

  if (piece.type === 'P') {
    const fDir = topology.getPawnForwardDir(fromId, seat);
    const links1 = topology.edgeSteps.get(fromId);
    const step1 = links1?.[fDir];

    if (step1 && !pieces[step1.nextCellId]) {
      const promote1 = topology.isPromotionCell(step1.nextCellId, seat);
      moves.push({
        from: fromId,
        to: step1.nextCellId,
        promotionRequired: promote1,
      });

      // Double push from starting pawn rank
      if (!piece.hasMoved && topology.getPawnDoubleStartCells(seat).has(fromId) && !promote1) {
        const fDir2 = step1.mapDir[fDir];
        const step2 = topology.edgeSteps.get(step1.nextCellId)?.[fDir2];
        if (step2 && !pieces[step2.nextCellId]) {
          moves.push({
            from: fromId,
            to: step2.nextCellId,
            promotionRequired: topology.isPromotionCell(step2.nextCellId, seat),
            enPassantRegisterTargetId: step1.nextCellId,
          });
        }
      }
    }

    // Diagonal captures (normal enemy pieces + en passant)
    for (const capTargetId of topology.getPawnCaptureTargets(fromId, seat)) {
      const targetPiece = pieces[capTargetId];
      if (targetPiece && targetPiece.seat !== seat) {
        moves.push({
          from: fromId,
          to: capTargetId,
          promotionRequired: topology.isPromotionCell(capTargetId, seat),
        });
      } else if (!targetPiece) {
        const ep = enPassantTargets.find((t) => t.targetCellId === capTargetId && t.ownerSeat !== seat);
        if (ep && pieces[ep.pawnCellId] && pieces[ep.pawnCellId].seat !== seat) {
          moves.push({
            from: fromId,
            to: capTargetId,
            isEnPassant: true,
            enPassantCapturedCellId: ep.pawnCellId,
            promotionRequired: topology.isPromotionCell(capTargetId, seat),
          });
        }
      }
    }

    return moves;
  }

  if (piece.type === 'N') {
    for (const toId of stepKnightUnion(topology, fromId)) {
      const occ = pieces[toId];
      if (!occ || occ.seat !== seat) {
        moves.push({ from: fromId, to: toId });
      }
    }
    return moves;
  }

  if (piece.type === 'K') {
    const links = topology.edgeSteps.get(fromId);
    const seen = new Set<string>();
    if (links) {
      for (let d = 0 as Dir4; d < 4; d = (d + 1) as Dir4) {
        const link = links[d];
        if (link) {
          const occ = pieces[link.nextCellId];
          if (!occ || occ.seat !== seat) {
            seen.add(link.nextCellId);
            moves.push({ from: fromId, to: link.nextCellId });
          }
        }
      }
    }
    const diag = topology.diagSteps.get(fromId);
    if (diag) {
      for (const pair of [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 3],
      ] as [Dir4, Dir4][]) {
        for (const t of diag.get(pairKey(pair[0], pair[1])) || []) {
          if (seen.has(t.nextCellId)) continue;
          const occ = pieces[t.nextCellId];
          if (!occ || occ.seat !== seat) {
            seen.add(t.nextCellId);
            moves.push({ from: fromId, to: t.nextCellId });
          }
        }
      }
    }

    // Castling
    if (!piece.hasMoved) {
      const castles = topology.castlesBySeat.get(seat) || [];
      for (const cDef of castles) {
        if (cDef.kingStartId !== fromId) continue;
        const rook = pieces[cDef.rookStartId];
        if (!rook || rook.seat !== seat || rook.type !== 'R' || rook.hasMoved) continue;
        if (cDef.mustBeEmptyIds.some((id) => Boolean(pieces[id]))) continue;

        // King cannot castle out of, through, or into check
        if (isCellAttackedByEnemies(topology, pieces, cDef.kingStartId, seat, eliminatedSet)) continue;
        if (isCellAttackedByEnemies(topology, pieces, cDef.kingPassId, seat, eliminatedSet)) continue;
        if (isCellAttackedByEnemies(topology, pieces, cDef.kingDestId, seat, eliminatedSet)) continue;

        moves.push({
          from: fromId,
          to: cDef.kingDestId,
          isCastle: true,
          castleRookFrom: cDef.rookStartId,
          castleRookTo: cDef.rookDestId,
        });
      }
    }

    return moves;
  }

  if (piece.type === 'R' || piece.type === 'Q') {
    for (const toId of generateSlidingEdgeTargets(topology, pieces, fromId, seat)) {
      moves.push({ from: fromId, to: toId });
    }
  }

  if (piece.type === 'B' || piece.type === 'Q') {
    const added = piece.type === 'Q' ? new Set(moves.map((m) => m.to)) : new Set<string>();
    for (const toId of generateSlidingDiagTargets(topology, pieces, fromId, seat)) {
      if (!added.has(toId)) {
        moves.push({ from: fromId, to: toId });
      }
    }
  }

  return moves;
}

function simulateMovePieces(pieces: Record<string, ChessPiece>, move: LegalChessMove, promotionType?: ChessPieceType): Record<string, ChessPiece> {
  const next = clonePieces(pieces);
  const moving = { ...next[move.from], hasMoved: true };
  if (move.promotionRequired) {
    const promo = promotionType && ['Q', 'R', 'B', 'N'].includes(promotionType) ? promotionType : 'Q';
    moving.type = promo;
  }
  delete next[move.from];

  if (move.isEnPassant && move.enPassantCapturedCellId) {
    delete next[move.enPassantCapturedCellId];
  }
  next[move.to] = moving;

  if (move.isCastle && move.castleRookFrom && move.castleRookTo) {
    const rook = next[move.castleRookFrom];
    if (rook) {
      delete next[move.castleRookFrom];
      next[move.castleRookTo] = { ...rook, hasMoved: true };
    }
  }

  return next;
}

export function getLegalMovesFromCell(state: ChessGameStateSnapshot, cellId: string): LegalChessMove[] {
  if (state.winnerSeat !== undefined || state.isDraw) return [];
  const piece = state.pieces[cellId];
  if (!piece || piece.seat !== state.activeSeat) return [];

  const topology = getChessTopology(state.variant);
  const eliminatedSet = new Set(state.eliminatedSeats);
  if (eliminatedSet.has(piece.seat)) return [];

  const pseudo = getPseudoLegalMovesForCell(topology, state.pieces, state.enPassantTargets, eliminatedSet, cellId);
  return pseudo.filter((mv) => {
    const simPieces = simulateMovePieces(state.pieces, mv);
    return !isSeatInCheckWithPieces(topology, simPieces, piece.seat, eliminatedSet);
  });
}

export function getAllLegalMoves(state: ChessGameStateSnapshot, seat: number): LegalChessMove[] {
  if (state.winnerSeat !== undefined || state.isDraw) return [];
  const eliminatedSet = new Set(state.eliminatedSeats);
  if (eliminatedSet.has(seat)) return [];

  const topology = getChessTopology(state.variant);
  const allMoves: LegalChessMove[] = [];
  for (const [cid, p] of Object.entries(state.pieces)) {
    if (p.seat !== seat) continue;
    const pseudo = getPseudoLegalMovesForCell(topology, state.pieces, state.enPassantTargets, eliminatedSet, cid);
    for (const mv of pseudo) {
      const simPieces = simulateMovePieces(state.pieces, mv);
      if (!isSeatInCheckWithPieces(topology, simPieces, seat, eliminatedSet)) {
        allMoves.push(mv);
      }
    }
  }
  return allMoves;
}

export function createInitialChessState(variant: ChessVariant): ChessGameStateSnapshot {
  const topology = getChessTopology(variant);
  return {
    variant,
    pieces: clonePieces(topology.initialPieces),
    activeSeat: 0,
    eliminatedSeats: [],
    inCheckSeats: [],
    enPassantTargets: [],
    halfMoveClock: 0,
    turnCount: 0,
    moveHistory: [],
  };
}

function findNextSurvivingSeat(totalSeats: number, fromSeat: number, eliminatedSet: Set<number>): number {
  for (let offset = 1; offset <= totalSeats; offset++) {
    const candidate = (fromSeat + offset) % totalSeats;
    if (!eliminatedSet.has(candidate)) {
      return candidate;
    }
  }
  return fromSeat;
}

function removeSeatPiecesFromBoard(pieces: Record<string, ChessPiece>, seat: number): void {
  for (const [cid, p] of Object.entries(pieces)) {
    if (p.seat === seat) {
      delete pieces[cid];
    }
  }
}

export function eliminateSeatFromState(
  state: ChessGameStateSnapshot,
  seatToEliminate: number
): ChessGameStateSnapshot {
  const topology = getChessTopology(state.variant);
  const totalSeats = topology.seats.length;
  const eliminatedSet = new Set(state.eliminatedSeats);
  if (eliminatedSet.has(seatToEliminate) || state.winnerSeat !== undefined || state.isDraw) {
    return state;
  }

  const nextPieces = clonePieces(state.pieces);
  removeSeatPiecesFromBoard(nextPieces, seatToEliminate);
  eliminatedSet.add(seatToEliminate);

  const nextEliminated = [...state.eliminatedSeats, seatToEliminate];
  const nextEp = state.enPassantTargets.filter((ep) => ep.ownerSeat !== seatToEliminate);
  const survivors = topology.seats.map((s) => s.seat).filter((s) => !eliminatedSet.has(s));

  const nextState: ChessGameStateSnapshot = {
    ...state,
    pieces: nextPieces,
    eliminatedSeats: nextEliminated,
    enPassantTargets: nextEp,
    inCheckSeats: [],
  };

  if (survivors.length === 1) {
    nextState.winnerSeat = survivors[0];
    return nextState;
  }

  let nextActive = state.activeSeat;
  if (seatToEliminate === state.activeSeat) {
    nextActive = findNextSurvivingSeat(totalSeats, state.activeSeat, eliminatedSet);
    nextState.enPassantTargets = nextState.enPassantTargets.filter((ep) => ep.ownerSeat !== nextActive);
  }
  nextState.activeSeat = nextActive;

  // Recompute checks & handle cascading mate/stalemate on survivors after piece removal
  return resolveTurnStartAndChecks(nextState);
}

function resolveTurnStartAndChecks(state: ChessGameStateSnapshot): ChessGameStateSnapshot {
  const topology = getChessTopology(state.variant);
  const totalSeats = topology.seats.length;
  const cur: ChessGameStateSnapshot = {
    ...state,
    pieces: clonePieces(state.pieces),
    eliminatedSeats: [...state.eliminatedSeats],
    enPassantTargets: [...state.enPassantTargets],
    inCheckSeats: [],
  };

  const computeChecks = () => {
    const elimSet = new Set(cur.eliminatedSeats);
    const checks: number[] = [];
    for (const s of topology.seats) {
      if (!elimSet.has(s.seat) && isSeatInCheckWithPieces(topology, cur.pieces, s.seat, elimSet)) {
        checks.push(s.seat);
      }
    }
    cur.inCheckSeats = checks;
  };

  // Clear en-passant ghost once that pawn owner's turn begins again
  cur.enPassantTargets = cur.enPassantTargets.filter((ep) => ep.ownerSeat !== cur.activeSeat);
  computeChecks();

  for (let guard = 0; guard < totalSeats; guard++) {
    const elimSet = new Set(cur.eliminatedSeats);
    const survivors = topology.seats.map((s) => s.seat).filter((s) => !elimSet.has(s));
    if (survivors.length === 1) {
      cur.winnerSeat = survivors[0];
      return cur;
    }

    const activeLegal = getAllLegalMoves(cur, cur.activeSeat);
    if (activeLegal.length > 0) {
      break;
    }

    const activeInCheck = cur.inCheckSeats.includes(cur.activeSeat);
    if (cur.variant === '2P') {
      if (activeInCheck) {
        cur.winnerSeat = cur.activeSeat === 0 ? 1 : 0;
      } else {
        cur.isDraw = true;
        cur.drawReason = 'DRAW_STALEMATE';
      }
      return cur;
    }

    // 3P / 4P Last King Standing: remove eliminated player's pieces & advance
    removeSeatPiecesFromBoard(cur.pieces, cur.activeSeat);
    cur.eliminatedSeats.push(cur.activeSeat);
    cur.enPassantTargets = cur.enPassantTargets.filter((ep) => ep.ownerSeat !== cur.activeSeat);

    const newElimSet = new Set(cur.eliminatedSeats);
    const remSurvivors = topology.seats.map((s) => s.seat).filter((s) => !newElimSet.has(s));
    if (remSurvivors.length === 1) {
      cur.inCheckSeats = [];
      cur.winnerSeat = remSurvivors[0];
      return cur;
    }

    cur.activeSeat = findNextSurvivingSeat(totalSeats, cur.activeSeat, newElimSet);
    cur.enPassantTargets = cur.enPassantTargets.filter((ep) => ep.ownerSeat !== cur.activeSeat);
    computeChecks();
  }

  return cur;
}

export function applyChessMove(
  state: ChessGameStateSnapshot,
  seat: number,
  input: ChessMoveInput
): MoveValidationResult {
  if (state.winnerSeat !== undefined || state.isDraw) {
    return { valid: false, reason: 'MATCH_ALREADY_ENDED' };
  }
  if (seat !== state.activeSeat) {
    return { valid: false, reason: 'NOT_YOUR_TURN' };
  }
  const topology = getChessTopology(state.variant);
  const eliminatedSet = new Set(state.eliminatedSeats);
  if (eliminatedSet.has(seat)) {
    return { valid: false, reason: 'PLAYER_ELIMINATED' };
  }

  const movingPiece = state.pieces[input.from];
  if (!movingPiece || movingPiece.seat !== seat) {
    return { valid: false, reason: 'INVALID_SOURCE_PIECE' };
  }

  const legalMoves = getLegalMovesFromCell(state, input.from);
  const chosen = legalMoves.find((m) => m.to === input.to);
  if (!chosen) {
    return { valid: false, reason: 'ILLEGAL_MOVE' };
  }

  let promotionPiece: ChessPieceType | undefined;
  if (chosen.promotionRequired) {
    promotionPiece =
      input.promotion && ['Q', 'R', 'B', 'N'].includes(input.promotion) ? input.promotion : 'Q';
  }

  let capturedPieceInfo: { seat: number; color: ChessPiece['color']; type: ChessPieceType } | undefined;
  if (chosen.isEnPassant && chosen.enPassantCapturedCellId) {
    const epVictim = state.pieces[chosen.enPassantCapturedCellId];
    if (epVictim) {
      capturedPieceInfo = { seat: epVictim.seat, color: epVictim.color, type: epVictim.type };
    }
  } else if (state.pieces[chosen.to]) {
    const victim = state.pieces[chosen.to];
    capturedPieceInfo = { seat: victim.seat, color: victim.color, type: victim.type };
  }

  const simPieces = simulateMovePieces(state.pieces, chosen, promotionPiece);
  const nextEpTargets = [...state.enPassantTargets];
  if (chosen.enPassantRegisterTargetId) {
    nextEpTargets.push({
      targetCellId: chosen.enPassantRegisterTargetId,
      pawnCellId: chosen.to,
      ownerSeat: seat,
    });
  }

  const isResetHalfMove = movingPiece.type === 'P' || Boolean(capturedPieceInfo);
  const nextHalfMove = isResetHalfMove ? 0 : state.halfMoveClock + 1;
  const totalSeats = topology.seats.length;
  const nextActive = findNextSurvivingSeat(totalSeats, seat, eliminatedSet);

  const prevElimLen = state.eliminatedSeats.length;

  let nextState: ChessGameStateSnapshot = {
    variant: state.variant,
    pieces: simPieces,
    activeSeat: nextActive,
    eliminatedSeats: [...state.eliminatedSeats],
    inCheckSeats: [],
    enPassantTargets: nextEpTargets,
    halfMoveClock: nextHalfMove,
    turnCount: state.turnCount + 1,
    moveHistory: [...state.moveHistory],
    lastMove: { from: chosen.from, to: chosen.to },
  };

  // Check if an opponent King was somehow captured directly (failsafe — normally impossible via legal check rules)
  for (const s of topology.seats) {
    if (!eliminatedSet.has(s.seat)) {
      const hasKing = Object.values(nextState.pieces).some((p) => p.seat === s.seat && p.type === 'K');
      if (!hasKing) {
        removeSeatPiecesFromBoard(nextState.pieces, s.seat);
        nextState.eliminatedSeats.push(s.seat);
      }
    }
  }

  // Advance and resolve check / checkmate / stalemate
  nextState = resolveTurnStartAndChecks(nextState);

  // Fifty-move draw rule (only if no winner yet)
  const maxHalfMoves = state.variant === '2P' ? 100 : state.variant === '3P' ? 150 : 200;
  if (nextState.winnerSeat === undefined && !nextState.isDraw && nextState.halfMoveClock >= maxHalfMoves) {
    nextState.isDraw = true;
    nextState.drawReason = 'DRAW_FIFTY_MOVE';
  }

  const eliminatedThisMove = nextState.eliminatedSeats.slice(prevElimLen);
  const fromLabel = topology.cellMap.get(chosen.from)?.label || chosen.from;
  const toLabel = topology.cellMap.get(chosen.to)?.label || chosen.to;
  const piecePrefix = movingPiece.type === 'P' ? '' : movingPiece.type;
  const capChar = capturedPieceInfo ? '×' : '→';
  const promoSuffix = promotionPiece ? `=${promotionPiece}` : '';
  const checkSuffix =
    nextState.winnerSeat !== undefined || eliminatedThisMove.length > 0
      ? '#'
      : nextState.inCheckSeats.length > 0
      ? '+'
      : '';
  let notation = `${piecePrefix}${fromLabel}${capChar}${toLabel}${promoSuffix}${checkSuffix}`;
  if (chosen.isCastle) {
    const castleIdx = (topology.castlesBySeat.get(seat) || []).findIndex((c) => c.kingDestId === chosen.to);
    notation = `${castleIdx === 1 ? 'O-O-O' : 'O-O'}${checkSuffix}`;
  }

  const moveRecord: ChessMoveRecord = {
    moveNumber: nextState.turnCount,
    seat,
    color: movingPiece.color,
    from: chosen.from,
    to: chosen.to,
    piece: movingPiece.type,
    captured: capturedPieceInfo,
    promotion: promotionPiece,
    isCastle: chosen.isCastle,
    isEnPassant: chosen.isEnPassant,
    givesCheckToSeats: nextState.inCheckSeats.length > 0 ? [...nextState.inCheckSeats] : undefined,
    eliminatedSeat: eliminatedThisMove.length > 0 ? eliminatedThisMove[0] : undefined,
    notation,
    timestamp: Date.now(),
  };

  nextState.moveHistory.push(moveRecord);

  return {
    valid: true,
    nextState,
    moveRecord,
    eliminatedSeatsThisMove: eliminatedThisMove,
  };
}
