import {
  DIFFICULTY_PRESETS,
  GameMode,
  GameRoomSummary,
  GameTurnState,
  PlayerInGame,
  RoomStatus,
  WordRejectionReason,
} from '@wordchain/shared';
import crypto from 'crypto';
import { TurnTimer } from './TurnTimer.js';
import { WordValidator } from './WordValidator.js';

export interface GameRoomCallbacks {
  onStateChange?: (summary: GameRoomSummary) => void;
  onTurnStart?: (turnState: GameTurnState) => void;
  onWordAccepted?: (payload: {
    word: string;
    acceptedByUserId: string;
    nextLetter: string;
    nextUserId: string;
    turnDurationMs: number;
    roundNumber: number;
  }) => void;
  onWordRejected?: (payload: {
    userId: string;
    word: string;
    reason: WordRejectionReason;
  }) => void;
  onLetterExhausted?: (payload: {
    exhaustedLetter: string;
    newLetter: string;
    awardedBonusToUserId: string;
  }) => void;
  onPlayerEliminated?: (payload: {
    userId: string;
    placement: number;
    reason: 'TIMEOUT' | 'FORFEIT' | 'DISCONNECT';
  }) => void;
  onMatchEnded?: (payload: {
    winnerId: string;
    standings: PlayerInGame[];
    historyWords: string[];
  }) => void;
}

export interface GameRoomOptions {
  roomId?: string;
  roomCode?: string;
  mode: GameMode;
  hostUserId: string;
  startTimerSec?: number;
  minTimerSec?: number;
  maxPlayers?: number;
  callbacks?: GameRoomCallbacks;
}

export class GameRoom {
  public readonly roomId: string;
  public readonly roomCode: string;
  public readonly mode: GameMode;
  public readonly createdAt: number = Date.now();
  public hostUserId: string;

  public status: RoomStatus = 'WAITING';
  public players: Map<string, PlayerInGame> = new Map();
  public turnOrder: string[] = [];
  public turnIndex: number = 0;

  public currentWord: string = '';
  public requiredLetter: string = '';
  public historyWords: Set<string> = new Set();
  public roundNumber: number = 0;

  private startTimerSec: number;
  private minTimerSec: number;
  private maxPlayers: number;

  private activeTimer: TurnTimer | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private turnStartTimestamp: number = 0;
  private validator: WordValidator;
  private callbacks: GameRoomCallbacks;

  constructor(options: GameRoomOptions) {
    this.roomId = options.roomId || crypto.randomUUID();
    this.roomCode = options.roomCode || this.generateRoomCode();
    this.mode = options.mode;
    this.hostUserId = options.hostUserId;

    // Difficulty settings
    const preset =
      this.mode === 'RANKED'
        ? DIFFICULTY_PRESETS.CLASSIC
        : DIFFICULTY_PRESETS.CLASSIC;

    this.startTimerSec = options.startTimerSec || preset.startTimerSec;
    this.minTimerSec = options.minTimerSec || preset.minTimerSec;
    this.maxPlayers = options.maxPlayers || (this.mode === 'RANKED' ? 4 : 8);

    this.validator = new WordValidator();
    this.callbacks = options.callbacks || {};
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  public addPlayer(player: PlayerInGame): boolean {
    if (this.status !== 'WAITING') return false;
    if (this.players.size >= this.maxPlayers) return false;
    if (this.players.has(player.userId)) return false;

    this.players.set(player.userId, {
      ...player,
      isAlive: true,
      isReady: player.userId === this.hostUserId, // Host is ready by default
      wordsSubmitted: 0,
      isDisconnected: false,
    });

    this.notifyStateChange();
    return true;
  }

  public removePlayer(userId: string): { wasHost: boolean; newHostId?: string; shouldClose: boolean } {
    const player = this.players.get(userId);
    if (!player) return { wasHost: false, shouldClose: this.players.size === 0 };

    const wasHost = this.hostUserId === userId;

    if (this.status === 'IN_PROGRESS' && player.isAlive) {
      // In-game forfeit/elimination
      this.eliminatePlayer(userId, 'FORFEIT');
    }

    this.players.delete(userId);

    // Host reassignment if needed
    let newHostId: string | undefined;
    if (wasHost && this.players.size > 0) {
      const remainingUserIds = Array.from(this.players.keys());
      this.hostUserId = remainingUserIds[0];
      newHostId = this.hostUserId;
    }

    const shouldClose = this.players.size === 0;

    if (!shouldClose) {
      this.notifyStateChange();
    } else {
      this.cleanup();
    }

    return { wasHost, newHostId, shouldClose };
  }

  public setPlayerReady(userId: string, isReady: boolean): void {
    const player = this.players.get(userId);
    if (!player || this.status !== 'WAITING') return;

    player.isReady = isReady;
    this.notifyStateChange();

    // Auto-start check for Casual/Ranked when all players ready
    if (this.mode === 'RANKED' && this.players.size === 4) {
      const allReady = Array.from(this.players.values()).every((p) => p.isReady);
      if (allReady) {
        this.startCountdown();
      }
    }
  }

  public startCountdown(): void {
    if (this.status !== 'WAITING') return;
    this.status = 'COUNTDOWN';
    this.notifyStateChange();

    this.countdownTimer = setTimeout(() => {
      this.startMatch();
    }, 3000); // 3 second countdown
  }

  public startMatch(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.status = 'IN_PROGRESS';
    this.roundNumber = 1;
    this.historyWords.clear();

    // Pick seed word
    this.currentWord = this.validator.getRandomSeedWord();
    this.requiredLetter = this.currentWord.slice(-1);
    this.historyWords.add(this.currentWord);

    // Establish randomized clockwise turn order
    const playerIds = Array.from(this.players.keys());
    this.turnOrder = this.shuffleArray(playerIds);
    this.turnIndex = 0;

    // Reset player states
    for (const player of this.players.values()) {
      player.isAlive = true;
      player.wordsSubmitted = 0;
      player.placement = undefined;
    }

    this.notifyStateChange();
    this.beginTurn();
  }

  private beginTurn(): void {
    if (this.status !== 'IN_PROGRESS') return;

    const activeUserId = this.getActivePlayerId();
    if (!activeUserId) {
      this.checkVictoryCondition();
      return;
    }

    // Calculate dynamic turn duration (e.g. 15s decrementing by 0.5s per round down to minTimerSec)
    const decrement = Math.floor((this.roundNumber - 1) / 2) * 0.5;
    const durationSec = Math.max(this.minTimerSec, this.startTimerSec - decrement);
    const durationMs = durationSec * 1000;

    this.turnStartTimestamp = Date.now();

    // Configure and start Authoritative Timer
    this.activeTimer?.stop();
    this.activeTimer = new TurnTimer({
      durationMs,
      gracePeriodMs: 400, // 400ms buffer for network latency
      onTimeout: () => this.handleTimeout(),
    });

    this.activeTimer.start();

    const turnState: GameTurnState = {
      roundNumber: this.roundNumber,
      activeUserId,
      requiredLetter: this.requiredLetter,
      turnDurationSec: durationSec,
      turnDeadlineUtc: this.activeTimer.getDeadlineUtc(),
      serverNowUtc: Date.now(),
    };

    this.callbacks.onTurnStart?.(turnState);
  }

  public submitWord(userId: string, rawWord: string, _clientTimestamp: number): { success: boolean; reason?: WordRejectionReason } {
    if (this.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'GAME_NOT_ACTIVE' };
    }

    // Verify it is this player's active turn
    const activeUserId = this.getActivePlayerId();
    if (userId !== activeUserId) {
      return { success: false, reason: 'NOT_YOUR_TURN' };
    }

    // Verify word with authoritative validator
    const validation = this.validator.validateSubmission(rawWord, this.requiredLetter, this.historyWords);

    if (!validation.isValid) {
      this.callbacks.onWordRejected?.({
        userId,
        word: rawWord.trim().toUpperCase(),
        reason: validation.reason!,
      });
      return { success: false, reason: validation.reason };
    }

    // Move is valid! Stop turn timer
    this.activeTimer?.stop();
    const turnDurationMs = Date.now() - this.turnStartTimestamp;

    const acceptedWord = validation.normalizedWord!;
    this.currentWord = acceptedWord;
    this.historyWords.add(acceptedWord);

    // Update player stats
    const player = this.players.get(userId);
    if (player) {
      player.wordsSubmitted += 1;
    }

    // Check letter exhaustion
    if (validation.isLetterExhausted) {
      this.callbacks.onLetterExhausted?.({
        exhaustedLetter: acceptedWord.slice(-1),
        newLetter: validation.replacementLetter!,
        awardedBonusToUserId: userId,
      });
      this.requiredLetter = validation.replacementLetter!;
    } else {
      this.requiredLetter = validation.nextLetter!;
    }

    // Advance to next turn
    this.advanceTurnIndex();
    this.roundNumber += 1;

    const nextUserId = this.getActivePlayerId()!;

    this.callbacks.onWordAccepted?.({
      word: acceptedWord,
      acceptedByUserId: userId,
      nextLetter: this.requiredLetter,
      nextUserId,
      turnDurationMs,
      roundNumber: this.roundNumber,
    });

    this.notifyStateChange();
    this.beginTurn();

    return { success: true };
  }

  public handleTimeout(): void {
    if (this.status !== 'IN_PROGRESS') return;

    const activeUserId = this.getActivePlayerId();
    if (!activeUserId) return;

    this.eliminatePlayer(activeUserId, 'TIMEOUT');
  }

  public eliminatePlayer(userId: string, reason: 'TIMEOUT' | 'FORFEIT' | 'DISCONNECT'): void {
    const player = this.players.get(userId);
    if (!player || !player.isAlive) return;

    player.isAlive = false;

    // Placement is the current number of surviving players + 1
    const aliveRemaining = this.getAlivePlayers().length;
    player.placement = aliveRemaining + 1;

    this.callbacks.onPlayerEliminated?.({
      userId,
      placement: player.placement,
      reason,
    });

    // Check if match should end
    if (this.checkVictoryCondition()) {
      return;
    }

    // Advance to next alive player and begin their turn
    this.advanceTurnIndex();
    this.roundNumber += 1;

    this.notifyStateChange();
    this.beginTurn();
  }

  private checkVictoryCondition(): boolean {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length <= 1) {
      this.activeTimer?.stop();
      this.status = 'FINISHED';

      const winner = alivePlayers[0] || Array.from(this.players.values())[0];
      if (winner) {
        winner.placement = 1;
      }

      const standings = Array.from(this.players.values()).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

      this.callbacks.onMatchEnded?.({
        winnerId: winner?.userId || '',
        standings,
        historyWords: Array.from(this.historyWords),
      });

      this.notifyStateChange();
      return true;
    }

    return false;
  }

  private advanceTurnIndex(): void {
    if (this.turnOrder.length === 0) return;

    let next = (this.turnIndex + 1) % this.turnOrder.length;
    let attempts = 0;

    while (attempts < this.turnOrder.length) {
      const candidateId = this.turnOrder[next];
      const player = this.players.get(candidateId);
      if (player && player.isAlive) {
        this.turnIndex = next;
        return;
      }
      next = (next + 1) % this.turnOrder.length;
      attempts++;
    }
  }

  public getActivePlayerId(): string | null {
    if (this.turnOrder.length === 0) return null;
    const activeId = this.turnOrder[this.turnIndex];
    const player = this.players.get(activeId);
    if (player && player.isAlive) {
      return activeId;
    }

    // Find next alive
    for (let i = 0; i < this.turnOrder.length; i++) {
      const id = this.turnOrder[i];
      const p = this.players.get(id);
      if (p && p.isAlive) {
        this.turnIndex = i;
        return id;
      }
    }

    return null;
  }

  public getAlivePlayers(): PlayerInGame[] {
    return Array.from(this.players.values()).filter((p) => p.isAlive);
  }

  public getSummary(): GameRoomSummary {
    const activeUserId = this.getActivePlayerId() || '';
    const durationMs = (this.activeTimer?.getDurationMs() || this.startTimerSec * 1000);

    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      mode: this.mode,
      status: this.status,
      hostUserId: this.hostUserId,
      players: Array.from(this.players.values()),
      currentWord: this.currentWord,
      requiredLetter: this.requiredLetter,
      turnState:
        this.status === 'IN_PROGRESS'
          ? {
              roundNumber: this.roundNumber,
              activeUserId,
              requiredLetter: this.requiredLetter,
              turnDurationSec: Math.round(durationMs / 1000),
              turnDeadlineUtc: this.activeTimer?.getDeadlineUtc() || 0,
              serverNowUtc: Date.now(),
            }
          : undefined,
      spectatorsCount: Array.from(this.players.values()).filter((p) => !p.isAlive).length,
      historyWords: Array.from(this.historyWords),
    };
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.getSummary());
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  public cleanup(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.activeTimer?.stop();
    this.activeTimer = null;
    this.players.clear();
    this.turnOrder = [];
    this.historyWords.clear();
  }
}
