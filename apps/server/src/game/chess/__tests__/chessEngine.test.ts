import {
  applyChessMove,
  chooseBestChessMove,
  createInitialChessState,
  eliminateSeatFromState,
  getAllLegalMoves,
  getChessTopology,
  getLegalMovesFromCell,
} from '@wordchain/shared';
import { describe, expect, it, vi } from 'vitest';
import { ChessGameRoom } from '../ChessGameRoom.js';

describe('Sovereign Chess Topology, Engine & Room State Machine (2P / 3P / 4P)', () => {
  describe('Board Topologies & Parity Invariants', () => {
    it('builds exact cell counts (64 / 96 / 160) with reciprocal edges and checkerboard parity', () => {
      const top2 = getChessTopology('2P');
      const top3 = getChessTopology('3P');
      const top4 = getChessTopology('4P');

      expect(top2.cells).toHaveLength(64);
      expect(top3.cells).toHaveLength(96);
      expect(top4.cells).toHaveLength(160);

      // Every non-border orthogonal edge across ALL 3 boards must connect two cells of OPPOSITE color!
      for (const top of [top2, top3, top4]) {
        for (const cell of top.cells) {
          const links = top.edgeSteps.get(cell.id)!;
          for (const link of links) {
            if (!link) continue;
            const neighbor = top.cellMap.get(link.nextCellId)!;
            expect(neighbor).toBeDefined();
            expect(neighbor.light).toBe(!cell.light);
          }
        }
      }
    });

    it('matches starting King/Queen orientations from reference diagrams for 3P and 4P', () => {
      const s3 = createInitialChessState('3P');
      // 3P Image 2: White Bottom Q=0:0:0 K=5:0:0, Black Top-Left Q=2:0:0 K=1:0:0, Red Top-Right Q=4:0:0 K=3:0:0
      expect(Object.keys(s3.pieces)).toHaveLength(48);
      expect(s3.pieces['0:0:0']?.type).toBe('Q');
      expect(s3.pieces['5:0:0']?.type).toBe('K');
      expect(s3.pieces['2:0:0']?.type).toBe('Q');
      expect(s3.pieces['1:0:0']?.type).toBe('K');
      expect(s3.pieces['4:0:0']?.type).toBe('Q');
      expect(s3.pieces['3:0:0']?.type).toBe('K');

      const s4 = createInitialChessState('4P');
      // 4P Image 1: Yellow Q=13,6 K=13,7; Blue K=6,0 Q=7,0; Red K=0,6 Q=0,7; Green Q=6,13 K=7,13
      expect(Object.keys(s4.pieces)).toHaveLength(64);
      expect(s4.pieces['13,6']?.type).toBe('Q');
      expect(s4.pieces['13,7']?.type).toBe('K');
      expect(s4.pieces['6,0']?.type).toBe('K');
      expect(s4.pieces['7,0']?.type).toBe('Q');
      expect(s4.pieces['0,6']?.type).toBe('K');
      expect(s4.pieces['0,7']?.type).toBe('Q');
      expect(s4.pieces['6,13']?.type).toBe('Q');
      expect(s4.pieces['7,13']?.type).toBe('K');
    });
  });

  describe('2P Classic Rules (Checkmate, Stalemate, En Passant, Castling)', () => {
    it('executes Scholar’s Mate checkmate cleanly and crowns White winner', () => {
      let state = createInitialChessState('2P');
      const seq = [
        { seat: 0, from: '6,4', to: '4,4' }, // e2-e4
        { seat: 1, from: '1,4', to: '3,4' }, // e7-e5
        { seat: 0, from: '7,5', to: '4,2' }, // Bf1-c4
        { seat: 1, from: '0,1', to: '2,2' }, // Nb8-c6
        { seat: 0, from: '7,3', to: '3,7' }, // Qd1-h5
        { seat: 1, from: '0,6', to: '2,5' }, // Ng8-f6
        { seat: 0, from: '3,7', to: '1,5' }, // Qxh7/f7#
      ];

      for (const mv of seq) {
        const res = applyChessMove(state, mv.seat, { from: mv.from, to: mv.to });
        expect(res.valid).toBe(true);
        state = res.nextState!;
      }

      expect(state.winnerSeat).toBe(0);
      expect(state.moveHistory[state.moveHistory.length - 1].notation).toContain('#');
    });

    it('supports En Passant capture and Castling in 2P', () => {
      let state = createInitialChessState('2P');
      // 1. e4 a6 2. e5 d5 -> White e5xd6 e.p.
      state = applyChessMove(state, 0, { from: '6,4', to: '4,4' }).nextState!;
      state = applyChessMove(state, 1, { from: '1,0', to: '2,0' }).nextState!;
      state = applyChessMove(state, 0, { from: '4,4', to: '3,4' }).nextState!;
      state = applyChessMove(state, 1, { from: '1,3', to: '3,3' }).nextState!;

      const epMoves = getLegalMovesFromCell(state, '3,4');
      const epMove = epMoves.find((m) => m.to === '2,3');
      expect(epMove).toBeDefined();
      expect(epMove!.isEnPassant).toBe(true);

      state = applyChessMove(state, 0, { from: '3,4', to: '2,3' }).nextState!;
      expect(state.pieces['3,3']).toBeUndefined(); // Captured pawn removed
      expect(state.pieces['2,3']?.seat).toBe(0);
    });
  });

  describe('3P Hexagonal Center Rosette & Last King Standing', () => {
    it('routes Bishop/Queen diagonal slides across the 3P center vertex forks (2:0:3 and 4:0:3)', () => {
      const state = createInitialChessState('3P');
      // Place a solo White Bishop at 0:1:2 (c3) and verify it reaches 0:0:3 -> forks to BOTH 2:0:3 and 4:0:3!
      state.pieces = {
        '5:0:0': { id: 'wk', seat: 0, color: 'WHITE', type: 'K', hasMoved: false },
        '1:0:0': { id: 'bk', seat: 1, color: 'BLACK', type: 'K', hasMoved: false },
        '3:0:0': { id: 'rk', seat: 2, color: 'RED', type: 'K', hasMoved: false },
        '0:1:2': { id: 'wb', seat: 0, color: 'WHITE', type: 'B', hasMoved: true },
      };

      const moves = getLegalMovesFromCell(state, '0:1:2').map((m) => m.to);
      expect(moves).toContain('0:0:3');
      expect(moves).toContain('2:0:3'); // Black center rosette
      expect(moves).toContain('4:0:3'); // Red center rosette
      expect(moves).toContain('2:1:2'); // Continues into Black's sector!
      expect(moves).toContain('4:1:2'); // Continues into Red's sector!
    });

    it('promotes a White pawn upon reaching Black’s back rank (1:u:0) and removes eliminated players pieces cleanly', () => {
      let state = createInitialChessState('3P');
      state.pieces = {
        '5:3:0': { id: 'wk', seat: 0, color: 'WHITE', type: 'K', hasMoved: true },
        '1:3:0': { id: 'bk', seat: 1, color: 'BLACK', type: 'K', hasMoved: true },
        '3:3:0': { id: 'rk', seat: 2, color: 'RED', type: 'K', hasMoved: true },
        '1:1:1': { id: 'wp', seat: 0, color: 'WHITE', type: 'P', hasMoved: true },
        '1:1:2': { id: 'bp', seat: 1, color: 'BLACK', type: 'P', hasMoved: true },
      };

      const promoMove = getLegalMovesFromCell(state, '1:1:1').find((m) => m.to === '1:1:0');
      expect(promoMove).toBeDefined();
      expect(promoMove!.promotionRequired).toBe(true);

      state = applyChessMove(state, 0, { from: '1:1:1', to: '1:1:0', promotion: 'Q' }).nextState!;
      expect(state.pieces['1:1:0']?.type).toBe('Q');

      // Now eliminate Seat 1 (Black) -> all Black pieces disappear, White (0) and Red (2) fight on
      state = eliminateSeatFromState(state, 1);
      expect(state.eliminatedSeats).toEqual([1]);
      expect(Object.values(state.pieces).some((p) => p.seat === 1)).toBe(false);
      expect(state.winnerSeat).toBeUndefined();
      expect(state.activeSeat).not.toBe(1);

      // Eliminate Seat 2 -> White (0) wins as Last King Standing
      state = eliminateSeatFromState(state, 2);
      expect(state.winnerSeat).toBe(0);
    });
  });

  describe('4P Cross 11th-Rank Promotion, Bot AI & ChessGameRoom Clock Lifecycle', () => {
    it('triggers 11th-rank pawn promotion across all 4 arms and picks valid AI moves', () => {
      const top4 = getChessTopology('4P');
      expect(top4.isPromotionCell('3,4', 0)).toBe(true); // Yellow enters row 3 (11th rank)
      expect(top4.isPromotionCell('4,4', 0)).toBe(false);
      expect(top4.isPromotionCell('5,10', 1)).toBe(true); // Blue enters col 10
      expect(top4.isPromotionCell('10,5', 2)).toBe(true); // Red enters row 10
      expect(top4.isPromotionCell('5,3', 3)).toBe(true); // Green enters col 3

      const s4 = createInitialChessState('4P');
      const aiMove = chooseBestChessMove(s4, 0);
      expect(aiMove).not.toBeNull();
      const legal = getAllLegalMoves(s4, 0);
      expect(legal.some((m) => m.from === aiMove!.from && m.to === aiMove!.to)).toBe(true);
    });

    it('runs a 4-Player ChessGameRoom match, processes sequential elimination to #1 winner, and settles placements', async () => {
      vi.useFakeTimers();
      try {
        let matchEnd: any = null;
        const room = new ChessGameRoom({
          mode: 'PRIVATE',
          variant: '4P',
          clockSec: 180,
          incrementSec: 3,
          hostUserId: 'u0',
          countdownDelayMs: 0,
          callbacks: {
            onMatchEnded: (payload) => {
              matchEnd = payload;
            },
          },
        });

        for (let i = 0; i < 4; i++) {
          room.addPlayer({
            userId: `u${i}`,
            username: `GM_${i}`,
            avatarId: 'avatar_01',
            tier: 'NURSERY',
            division: 3,
            isReady: true,
          });
        }

        room.startMatch();
        expect(room.status).toBe('IN_PROGRESS');
        expect(room.getSummary().variant).toBe('4P');

        // Seat 0 makes opening pawn push
        const moveRes = room.submitMove('u0', { from: '12,6', to: '10,6' });
        expect(moveRes.success).toBe(true);
        expect(room.gameState!.activeSeat).toBe(1);
        expect(room.players.get('u0')!.movesPlayed).toBe(1);

        // Resign seats 1 -> #4, 2 -> #3, 3 -> #2 => Seat 0 wins #1!
        room.resignPlayer('u1', 'RESIGN');
        expect(room.players.get('u1')!.placement).toBe(4);
        room.resignPlayer('u2', 'RESIGN');
        expect(room.players.get('u2')!.placement).toBe(3);
        room.resignPlayer('u3', 'RESIGN');

        expect(room.status).toBe('FINISHED');
        expect(matchEnd).not.toBeNull();
        expect(matchEnd.winnerId).toBe('u0');
        expect(matchEnd.standings.map((p: any) => p.placement)).toEqual([1, 2, 3, 4]);
        room.cleanup();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
