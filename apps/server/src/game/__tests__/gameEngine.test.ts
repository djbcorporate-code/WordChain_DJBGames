import { LexiconService } from '@wordchain/lexicon';
import { PlayerInGame } from '@wordchain/shared';
import path from 'path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GameRoom } from '../GameRoom.js';
import { RoomManager } from '../RoomManager.js';
import { TurnTimer } from '../TurnTimer.js';
import { WordValidator } from '../WordValidator.js';

describe('Authoritative Word Game Engine', () => {
  beforeAll(async () => {
    const lexicon = LexiconService.getInstance();
    await lexicon.initialize();
  });

  describe('TurnTimer', () => {
    it('should start with correct deadline and track remaining time', () => {
      const timer = new TurnTimer({
        durationMs: 1000,
        gracePeriodMs: 200,
        onTimeout: () => {},
      });

      timer.start();
      expect(timer.getRemainingMs()).toBeGreaterThan(900);
      expect(timer.getRemainingMs()).toBeLessThanOrEqual(1000);
      expect(timer.isExpired()).toBe(false);

      timer.stop();
      expect(timer.isExpired()).toBe(true);
    });

    it('should trigger onTimeout when time expires', async () => {
      vi.useFakeTimers();
      const onTimeout = vi.fn();

      const timer = new TurnTimer({
        durationMs: 500,
        gracePeriodMs: 100,
        onTimeout,
      });

      timer.start();
      expect(onTimeout).not.toHaveBeenCalled();

      // Fast forward past duration + grace period (600ms)
      vi.advanceTimersByTime(650);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('WordValidator', () => {
    const validator = new WordValidator();

    it('should validate suffix submission correctly and assemble complete word', () => {
      const history = new Set(['PLANET']);
      // Prefix is 'T', player inputs suffix 'IGER' -> completes 'TIGER'
      const res = validator.validateSubmission('IGER', 'T', history);

      expect(res.isValid).toBe(true);
      expect(res.normalizedWord).toBe('TIGER');
      expect(res.nextLetter).toBe('R');
    });

    it('should accept full-word submission starting with prefix without double-prefixing (e.g. typing TIME when prefix is T)', () => {
      const history = new Set(['PLANET']);
      // Typing 'TIME' when prefix is 'T' recognizes full word 'TIME' rather than invalid 'TTIME'
      const res = validator.validateSubmission('TIME', 'T', history);

      expect(res.isValid).toBe(true);
      expect(res.normalizedWord).toBe('TIME');
      expect(res.nextLetter).toBe('E');
    });

    it('should reject already chained words', () => {
      const history = new Set(['PLANET', 'TIGER']);
      const res = validator.validateSubmission('IGER', 'T', history);

      expect(res.isValid).toBe(false);
      expect(res.reason).toBe('ALREADY_USED');
    });

    it('should accept suffix-only submission and assemble candidate with required prefix', () => {
      const history = new Set(['PLANET']);
      // Prefix is 'T', player inputs lacking letters 'IME' -> forms 'TIME'
      const res = validator.validateSubmission('IME', 'T', history);

      expect(res.isValid).toBe(true);
      expect(res.normalizedWord).toBe('TIME');
    });

    it('should use 2-letter trailing prefix in round 20 and up', () => {
      const history = new Set(['EARTH']);
      // Round 20: prefix 'P', suffix 'LANET' -> completes 'PLANET' -> next trailing prefix is 'ET'
      const res = validator.validateSubmission('LANET', 'P', history, 20);

      expect(res.isValid).toBe(true);
      expect(res.normalizedWord).toBe('PLANET');
      expect(res.nextLetter).toBe('ET');
    });

    it('should reject non-dictionary words', () => {
      const history = new Set(['PLANET']);
      const res = validator.validateSubmission('XQZJJ', 'T', history);

      expect(res.isValid).toBe(false);
      expect(res.reason).toBe('NOT_IN_DICTIONARY');
    });
  });

  describe('GameRoom State Machine & Match Flow', () => {
    const createPlayer = (id: string, name: string): PlayerInGame => ({
      userId: id,
      username: name,
      avatarId: 'avatar_default_01',
      tier: 'NURSERY',
      division: 3,
      isAlive: true,
      isReady: true,
      lives: 3,
      wordsSubmitted: 0,
      isDisconnected: false,
    });

    it('should manage player lobby and transition to IN_PROGRESS on match start', () => {
      const room = new GameRoom({
        mode: 'CASUAL',
        hostUserId: 'p1',
        startTimerSec: 15,
        minTimerSec: 6,
      });

      expect(room.status).toBe('WAITING');
      expect(room.addPlayer(createPlayer('p1', 'PlayerOne'))).toBe(true);
      expect(room.addPlayer(createPlayer('p2', 'PlayerTwo'))).toBe(true);
      expect(room.players.size).toBe(2);

      room.startMatch();

      expect(room.status).toBe('IN_PROGRESS');
      expect(room.currentWord.length).toBeGreaterThanOrEqual(3);
      expect(room.requiredLetter).toBe(room.currentWord.slice(-1));
      expect(room.roundNumber).toBe(1);
      expect(room.getActivePlayerId()).toBeDefined();

      room.cleanup();
    });

    it('should advance turns clockwise on valid submissions', () => {
      const onWordAccepted = vi.fn();
      const onTurnStart = vi.fn();

      const room = new GameRoom({
        mode: 'RANKED',
        hostUserId: 'p1',
        callbacks: {
          onWordAccepted,
          onTurnStart,
        },
      });

      room.addPlayer(createPlayer('p1', 'PlayerOne'));
      room.addPlayer(createPlayer('p2', 'PlayerTwo'));
      room.startMatch();

      const firstActiveId = room.getActivePlayerId()!;
      const otherId = firstActiveId === 'p1' ? 'p2' : 'p1';

      // 1. Non-active player tries to submit
      const nonTurnSub = room.submitWord(otherId, 'ANYWORD', Date.now());
      expect(nonTurnSub.success).toBe(false);
      expect(nonTurnSub.reason).toBe('NOT_YOUR_TURN');

      // 2. Active player submits invalid suffix
      const invalidSuffix = 'XQZJJ';
      const wrongSub = room.submitWord(firstActiveId, invalidSuffix, Date.now());
      expect(wrongSub.success).toBe(false);

      // 3. Active player submits valid suffix
      const required = room.requiredLetter;
      const candidates = LexiconService.getInstance().getTrie().getWordsWithPrefix(required, 10);
      const validWord = candidates.find((w) => !room.historyWords.has(w))!;
      expect(validWord).toBeDefined();

      const validSuffix = validWord.slice(required.length);
      const validSub = room.submitWord(firstActiveId, validSuffix, Date.now());
      expect(validSub.success).toBe(true);

      expect(onWordAccepted).toHaveBeenCalled();
      expect(room.currentWord).toBe(validWord);
      expect(room.roundNumber).toBe(2);
      expect(room.getActivePlayerId()).toBe(otherId);

      room.cleanup();
    });

    it('should grant players 3 lives and eliminate on 3rd timeout instead of instant game over', () => {
      const onPlayerEliminated = vi.fn();
      const onMatchEnded = vi.fn();
      const onLifeLost = vi.fn();

      const room = new GameRoom({
        mode: 'CASUAL',
        hostUserId: 'p1',
        callbacks: {
          onPlayerEliminated,
          onMatchEnded,
          onLifeLost,
        },
      });

      room.addPlayer(createPlayer('p1', 'PlayerOne'));
      room.addPlayer(createPlayer('p2', 'PlayerTwo'));
      room.startMatch();

      const p1 = room.players.get('p1')!;
      const p2 = room.players.get('p2')!;
      expect(p1.lives).toBe(3);
      expect(p2.lives).toBe(3);

      const firstActiveId = room.getActivePlayerId()!;
      const targetPlayer = room.players.get(firstActiveId)!;
      const expectedWinnerId = firstActiveId === 'p1' ? 'p2' : 'p1';

      // 1st Timeout: Loses 1 life -> 2 lives remaining, match stays IN_PROGRESS
      room.handleTimeout();
      expect(targetPlayer.lives).toBe(2);
      expect(targetPlayer.isAlive).toBe(true);
      expect(room.status).toBe('IN_PROGRESS');
      expect(onLifeLost).toHaveBeenCalledWith({ userId: firstActiveId, livesRemaining: 2 });
      expect(onPlayerEliminated).not.toHaveBeenCalled();

      // Set targetPlayer lives to 1 and active to test final elimination
      targetPlayer.lives = 1;
      (room as any).turnOrder = [firstActiveId, expectedWinnerId];
      (room as any).turnIndex = 0;

      // Final Timeout: Reaches 0 lives -> now eliminated!
      room.handleTimeout();
      expect(targetPlayer.lives).toBe(0);
      expect(targetPlayer.isAlive).toBe(false);

      expect(onPlayerEliminated).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: firstActiveId,
          placement: 2,
          reason: 'TIMEOUT',
        })
      );

      // Since only 2 players were in match, the other wins!
      expect(room.status).toBe('FINISHED');
      expect(onMatchEnded).toHaveBeenCalledWith(
        expect.objectContaining({
          winnerId: expectedWinnerId,
        })
      );

      const summary = room.getSummary();
      const winner = summary.players.find((p) => p.userId === expectedWinnerId);
      expect(winner?.placement).toBe(1);

      room.cleanup();
    });
  });

  describe('RoomManager', () => {
    it('should create, lookup by code, and remove rooms', () => {
      const manager = RoomManager.getInstance();
      manager.clearAll();

      const room = manager.createRoom({
        mode: 'PRIVATE',
        hostUserId: 'host-123',
      });

      expect(manager.getActiveRoomsCount()).toBe(1);
      expect(manager.getRoom(room.roomId)).toBe(room);
      expect(manager.getRoomByCode(room.roomCode)).toBe(room);

      manager.removeRoom(room.roomId);
      expect(manager.getActiveRoomsCount()).toBe(0);
      expect(manager.getRoom(room.roomId)).toBeUndefined();
      expect(manager.getRoomByCode(room.roomCode)).toBeUndefined();
    });
  });
});
