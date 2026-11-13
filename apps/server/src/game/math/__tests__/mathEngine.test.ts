import { describe, expect, it, vi } from 'vitest';
import { MathEquationGenerator } from '../MathEquationGenerator.js';
import { MathGameRoom } from '../MathGameRoom.js';

describe('MathEquationGenerator & MathGameRoom Engine', () => {
  describe('MathEquationGenerator', () => {
    it('generates 12 unique random pick options between 1 and 99 inclusive', () => {
      const options = MathEquationGenerator.generatePickOptions();
      expect(options).toHaveLength(12);
      const unique = new Set(options);
      expect(unique.size).toBe(12);
      for (const n of options) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(99);
        expect(Number.isInteger(n)).toBe(true);
      }
    });

    it('builds exact ADD, SUBTRACT (negative allowed), MULTIPLY, and 4-choice DIVIDE problems for 2-6 players', () => {
      // Exact example from spec: 21 + 6 + 3 = ?
      const addEq = MathEquationGenerator.buildEquation(
        [
          { userId: 'u1', username: 'P1', number: 21 },
          { userId: 'u2', username: 'P2', number: 6 },
          { userId: 'u3', username: 'P3', number: 3 },
        ],
        'ADD'
      );
      expect(addEq.equationDisplay).toBe('21 + 6 + 3 = ?');
      expect(addEq.correctAnswer).toBe('30');
      expect(addEq.choices).toBeUndefined();

      // SUBTRACT: negatives allowed
      const subEq = MathEquationGenerator.buildEquation(
        [
          { userId: 'u1', username: 'P1', number: 5 },
          { userId: 'u2', username: 'P2', number: 20 },
          { userId: 'u3', username: 'P3', number: 10 },
        ],
        'SUBTRACT'
      );
      expect(subEq.equationDisplay).toBe('5 - 20 - 10 = ?');
      expect(subEq.correctAnswer).toBe('-25');

      // MULTIPLY 2 players & 6 players
      const mul2 = MathEquationGenerator.buildEquation(
        [
          { userId: 'u1', username: 'P1', number: 12 },
          { userId: 'u2', username: 'P2', number: 9 },
        ],
        'MULTIPLY'
      );
      expect(mul2.equationDisplay).toBe('12 × 9 = ?');
      expect(mul2.correctAnswer).toBe('108');

      const mul6 = MathEquationGenerator.buildEquation(
        [
          { userId: 'u1', username: 'P1', number: 10 },
          { userId: 'u2', username: 'P2', number: 5 },
          { userId: 'u3', username: 'P3', number: 2 },
          { userId: 'u4', username: 'P4', number: 3 },
          { userId: 'u5', username: 'P5', number: 1 },
          { userId: 'u6', username: 'P6', number: 4 },
        ],
        'MULTIPLY'
      );
      expect(mul6.equationDisplay).toBe('(10 + 5 + 2 + 3 + 1) × 4 = ?');
      expect(mul6.correctAnswer).toBe('84');

      // DIVIDE -> always 4 distinct choices including exact rounded-to-2dp correctAnswer
      const divEq = MathEquationGenerator.buildEquation(
        [
          { userId: 'u1', username: 'P1', number: 22 },
          { userId: 'u2', username: 'P2', number: 5 },
          { userId: 'u3', username: 'P3', number: 6 },
        ],
        'DIVIDE'
      );
      expect(divEq.equationDisplay).toBe('(22 + 5) ÷ 6 = ?');
      expect(divEq.correctAnswer).toBe('4.5');
      expect(divEq.choices).toHaveLength(4);
      expect(new Set(divEq.choices).size).toBe(4);
      expect(divEq.choices).toContain('4.5');
    });

    it('validates division rounding and integer answers cleanly', () => {
      expect(MathEquationGenerator.isAnswerCorrect('4.50', '4.5', 'DIVIDE')).toBe(true);
      expect(MathEquationGenerator.isAnswerCorrect('-25', '-25', 'SUBTRACT')).toBe(true);
      expect(MathEquationGenerator.isAnswerCorrect('30.5', '30', 'ADD')).toBe(false);
    });
  });

  describe('MathGameRoom 10-Round State Machine', () => {
    it('auto-picks unpicked players after 3 seconds and reveals equation for racing', async () => {
      vi.useFakeTimers();
      try {
        let latestRace: any = null;
        const room = new MathGameRoom({
          mode: 'PRIVATE',
          operationMode: 'ADD',
          hostUserId: 'p1',
          maxPlayers: 6,
          resultDelayMs: 100,
          callbacks: {
            onRoundRaceStart: (payload) => {
              latestRace = payload;
            },
          },
        });

        for (let i = 1; i <= 6; i++) {
          room.addPlayer({
            userId: `p${i}`,
            username: `Player${i}`,
            avatarId: 'avatar_01',
            tier: 'NURSERY',
            division: 3,
            isReady: true,
          });
        }

        expect(room.players.size).toBe(6);
        room.startMatch();

        const pickOptions = room.getSummary().roundState!.pickOptions;
        expect(pickOptions).toHaveLength(12);

        // Only P1 manually picks; P2..P6 let 3s pick timer expire
        const pickRes = room.submitPick('p1', pickOptions[0]);
        expect(pickRes.success).toBe(true);
        expect(room.phase).toBe('PICKING');

        // Advance past 3s + 350ms grace period
        await vi.advanceTimersByTimeAsync(3500);

        expect(room.phase).toBe('RACING');
        expect(latestRace).not.toBeNull();
        expect(latestRace.picks).toHaveLength(6);
        room.cleanup();
      } finally {
        vi.useRealTimers();
      }
    });

    it('locks out wrong Division choices immediately (1 attempt) while allowing retries on Addition', async () => {
      let currentEquation = '';
      const solvedEvents: any[] = [];
      const room = new MathGameRoom({
        mode: 'CASUAL',
        operationMode: 'DIVIDE',
        hostUserId: 'p1',
        maxPlayers: 2,
        resultDelayMs: 50,
        callbacks: {
          onRoundRaceStart: (payload) => {
            currentEquation = payload.equationDisplay;
          },
          onPlayerSolved: (payload) => {
            solvedEvents.push(payload);
          },
        },
      });

      room.addPlayer({ userId: 'p1', username: 'Alice', avatarId: 'a1', tier: 'NURSERY', division: 3, isReady: true });
      room.addPlayer({ userId: 'p2', username: 'Bob', avatarId: 'a1', tier: 'NURSERY', division: 3, isReady: true });
      room.startMatch();

      const opts = room.getSummary().roundState!.pickOptions;
      room.submitPick('p1', opts[0]);
      room.submitPick('p2', opts[1]); // both picked -> immediate advance to RACING!

      expect(room.phase).toBe('RACING');
      expect(currentEquation).toContain('÷');
      const choices = room.getSummary().roundState!.choices!;
      expect(choices).toHaveLength(4);

      const p1Pick = room.players.get('p1')!.pickedNumber!;
      const p2Pick = room.players.get('p2')!.pickedNumber!;
      const expected = MathEquationGenerator.formatDivisionValue(p1Pick / p2Pick);
      const wrongChoice = choices.find((c) => c !== expected)!;

      // Alice clicks wrong choice -> locked out for the round
      const wrongAttempt = room.submitAnswer('p1', wrongChoice);
      expect(wrongAttempt.success).toBe(false);
      expect(wrongAttempt.lockedOut).toBe(true);
      expect(room.players.get('p1')!.lockedOutThisRound).toBe(true);

      // Even if Alice later sends the right choice in the same round, she stays locked out
      const secondAttempt = room.submitAnswer('p1', expected);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.reason).toBe('LOCKED_OUT');

      // Bob picks the right choice -> wins round & advances to ROUND_RESULT
      const bobAttempt = room.submitAnswer('p2', expected);
      expect(bobAttempt.success).toBe(true);
      expect(solvedEvents).toHaveLength(1);
      expect(room.players.get('p2')!.score).toBe(100);
      expect(room.phase).toBe('ROUND_RESULT');

      room.cleanup();
    });

    it('completes a full 10-round match with retryable manual ops and declares highest score winner', async () => {
      vi.useFakeTimers();
      try {
        let matchEndResult: any = null;
        const room = new MathGameRoom({
          mode: 'RANKED',
          operationMode: 'ADD',
          hostUserId: 'p1',
          maxPlayers: 3,
          resultDelayMs: 50,
          callbacks: {
            onMatchEnded: (payload) => {
              matchEndResult = payload;
            },
          },
        });

        room.addPlayer({ userId: 'p1', username: 'One', avatarId: 'a1', tier: 'NURSERY', division: 3, isReady: true });
        room.addPlayer({ userId: 'p2', username: 'Two', avatarId: 'a1', tier: 'NURSERY', division: 3, isReady: true });
        room.addPlayer({ userId: 'p3', username: 'Three', avatarId: 'a1', tier: 'NURSERY', division: 3, isReady: true });
        room.startMatch();

        for (let r = 1; r <= 10; r++) {
          const state = room.getSummary().roundState!;
          expect(state.roundNumber).toBe(r);
          expect(state.phase).toBe('PICKING');

          room.submitPick('p1', state.pickOptions[0]);
          room.submitPick('p2', state.pickOptions[1]);
          room.submitPick('p3', state.pickOptions[2]);
          expect(room.phase).toBe('RACING');

          const sum = state.pickOptions[0] + state.pickOptions[1] + state.pickOptions[2];

          // Wrong manual guess on ADD does NOT lock out
          const badGuess = room.submitAnswer('p1', String(sum + 5));
          expect(badGuess.success).toBe(false);
          expect(badGuess.lockedOut).toBe(false);

          // Speed order: p2 solves #1 (+100), p1 solves #2 (+75), p3 solves #3 (+60)
          expect(room.submitAnswer('p2', String(sum)).success).toBe(true);
          expect(room.submitAnswer('p1', String(sum)).success).toBe(true);
          expect(room.submitAnswer('p3', String(sum)).success).toBe(true);

          expect(room.phase).toBe('ROUND_RESULT');
          await vi.advanceTimersByTimeAsync(100);
        }

        expect(matchEndResult).not.toBeNull();
        expect(matchEndResult.winnerId).toBe('p2');
        expect(matchEndResult.standings[0].score).toBe(1000);
        expect(matchEndResult.standings[1].score).toBe(750);
        expect(matchEndResult.standings[2].score).toBe(600);
        room.cleanup();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
