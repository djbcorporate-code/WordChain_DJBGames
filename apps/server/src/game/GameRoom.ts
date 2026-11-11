import {
  DIFFICULTY_PRESETS,
  GameLanguage,
  GameMode,
  GameRoomSummary,
  GameTurnState,
  PlayerInGame,
  RoomStatus,
  WordRejectionReason,
} from '@wordchain/shared';
import { LexiconService } from '@wordchain/lexicon';
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
    timePenaltySec?: number;
    penalizedUserId?: string;
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
  onLifeLost?: (payload: {
    userId: string;
    livesRemaining: number;
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
  language?: GameLanguage;
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
  public readonly language: GameLanguage;
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

  public startTimerSec: number;
  public minTimerSec: number;
  public maxPlayers: number;

  private activeTimer: TurnTimer | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private turnStartTimestamp: number = 0;
  private pendingTimePenaltySec: number = 0;
  private validator: WordValidator;
  private callbacks: GameRoomCallbacks;

  constructor(options: GameRoomOptions) {
    this.roomId = options.roomId || crypto.randomUUID();
    this.roomCode = options.roomCode || this.generateRoomCode();
    this.mode = options.mode;
    this.language = options.language || 'ENGLISH';
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
      lives: player.lives ?? 3,
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

    // If no human players remain, room must close immediately (bots shouldn't hold a room open)
    const remainingHumans = Array.from(this.players.values()).filter((p) => !p.userId.startsWith('guest-bot-'));
    const shouldClose = remainingHumans.length === 0;

    // Host reassignment if needed (prefer remaining human scholars)
    let newHostId: string | undefined;
    if (wasHost && !shouldClose) {
      this.hostUserId = remainingHumans[0].userId;
      newHostId = this.hostUserId;
    }

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
    if (this.mode === 'RANKED' && this.players.size >= 2) {
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
    this.currentWord = this.validator.getRandomSeedWord(this.language);
    this.requiredLetter = this.currentWord.slice(-1);
    this.historyWords.add(this.currentWord);

    // Establish randomized clockwise turn order
    const playerIds = Array.from(this.players.keys());
    this.turnOrder = this.shuffleArray(playerIds);
    this.turnIndex = 0;

    // Reset player states
    for (const player of this.players.values()) {
      player.isAlive = true;
      player.lives = 3;
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

    // Calculate dynamic escalating turn duration
    // Rounds 1-5: startTimerSec (15s)
    // Rounds 6-10: 13s
    // Rounds 11-15: 11s
    // Rounds 16-19: 9s
    // Rounds 20-24: 8s
    // Rounds 25+: 6s (minimum floor at minTimerSec)
    let durationSec = this.startTimerSec;
    if (this.roundNumber >= 25) {
      durationSec = Math.max(5, this.minTimerSec);
    } else if (this.roundNumber >= 20) {
      durationSec = Math.max(8, this.minTimerSec);
    } else if (this.roundNumber >= 16) {
      durationSec = Math.max(9, this.minTimerSec);
    } else if (this.roundNumber >= 11) {
      durationSec = Math.max(11, this.minTimerSec);
    } else if (this.roundNumber >= 6) {
      durationSec = Math.max(13, this.minTimerSec);
    } else {
      durationSec = this.startTimerSec;
    }

    // Apply pending -2s time attack penalty if previous turn word was 7+ letters
    if (this.pendingTimePenaltySec > 0) {
      durationSec = Math.max(3, durationSec - this.pendingTimePenaltySec);
      this.pendingTimePenaltySec = 0;
    }

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

    // If active player is an automated guest scholar, auto-play a valid suffix word
    if (activeUserId.startsWith('guest-bot-')) {
      const prefix = this.requiredLetter;
      const candidates = LexiconService.getInstance().getTrie(this.language).getWordsWithPrefix(prefix, 30);
      const valid = candidates.find((w) => !this.historyWords.has(w) && w.length >= 3);
      const chosenWord = valid || `${prefix}EST`;
      const suffix = chosenWord.slice(prefix.length);

      const botDelay = Math.min(2500, Math.max(1200, durationSec * 300));
      setTimeout(() => {
        if (this.status === 'IN_PROGRESS' && this.getActivePlayerId() === activeUserId) {
          this.submitWord(activeUserId, suffix, Date.now());
        }
      }, botDelay);
    }
  }

  public submitWord(userId: string, rawWord: string, _clientTimestamp: number): { success: boolean; reason?: WordRejectionReason } {
    if (!rawWord || typeof rawWord !== 'string' || !rawWord.trim()) {
      return { success: false, reason: 'TOO_SHORT' };
    }

    if (this.status !== 'IN_PROGRESS') {
      return { success: false, reason: 'GAME_NOT_ACTIVE' };
    }

    // Verify it is this player's active turn
    const activeUserId = this.getActivePlayerId();
    if (userId !== activeUserId) {
      return { success: false, reason: 'NOT_YOUR_TURN' };
    }

    // Verify word with authoritative validator (passes next round number for 2-letter prefix rule)
    const nextRound = this.roundNumber + 1;
    const validation = this.validator.validateSubmission(
      rawWord,
      this.requiredLetter,
      this.historyWords,
      nextRound,
      this.language
    );

    if (!validation.isValid) {
      this.callbacks.onWordRejected?.({
        userId,
        word: validation.normalizedWord || rawWord.trim().toUpperCase(),
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
      const prefixLen = nextRound >= 20 ? 2 : 1;
      this.callbacks.onLetterExhausted?.({
        exhaustedLetter: acceptedWord.slice(-prefixLen),
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

    // 7+ letter words penalize the next player with -2 seconds on their timer
    const timePenaltySec = acceptedWord.length >= 7 ? 2 : 0;
    if (timePenaltySec > 0) {
      this.pendingTimePenaltySec = timePenaltySec;
    }

    this.callbacks.onWordAccepted?.({
      word: acceptedWord,
      acceptedByUserId: userId,
      nextLetter: this.requiredLetter,
      nextUserId,
      turnDurationMs,
      roundNumber: this.roundNumber,
      timePenaltySec: timePenaltySec > 0 ? timePenaltySec : undefined,
      penalizedUserId: timePenaltySec > 0 ? nextUserId : undefined,
    });

    this.notifyStateChange();
    this.beginTurn();

    return { success: true };
  }

  public handleTimeout(): void {
    if (this.status !== 'IN_PROGRESS') return;

    const activeUserId = this.getActivePlayerId();
    if (!activeUserId) return;

    const player = this.players.get(activeUserId);
    if (!player || !player.isAlive) return;

    // Deduct 1 life
    const remainingLives = Math.max(0, (player.lives ?? 3) - 1);
    player.lives = remainingLives;

    this.callbacks.onLifeLost?.({
      userId: activeUserId,
      livesRemaining: remainingLives,
    });

    if (remainingLives <= 0) {
      // Reached 0 lives -> eliminate player
      this.eliminatePlayer(activeUserId, 'TIMEOUT');
    } else {
      // Still has lives! Advance turn to next alive player and continue match
      this.advanceTurnIndex();
      this.roundNumber += 1;
      this.notifyStateChange();
      this.beginTurn();
    }
  }

  public eliminatePlayer(userId: string, reason: 'TIMEOUT' | 'FORFEIT' | 'DISCONNECT'): void {
    const player = this.players.get(userId);
    if (!player || !player.isAlive) return;

    player.isAlive = false;
    player.lives = 0;

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

    const alivePlayers = this.getAlivePlayers();
    if (alivePlayers.length <= 1) return;

    const currentActiveId = this.turnOrder[this.turnIndex];

    // For multiple players (> 2), randomize who goes next among other surviving scholars
    if (alivePlayers.length > 2) {
      const candidates = alivePlayers.filter((p) => p.userId !== currentActiveId);
      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        const chosenIndex = this.turnOrder.indexOf(chosen.userId);
        if (chosenIndex !== -1) {
          this.turnIndex = chosenIndex;
          return;
        }
      }
    }

    // 2-player or fallback: next alive scholar in turn order
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

  public resetToLobby(): boolean {
    if (this.status !== 'FINISHED' || this.mode !== 'PRIVATE') return false;

    this.activeTimer?.stop();
    this.activeTimer = null;
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.status = 'WAITING';
    this.roundNumber = 0;
    this.currentWord = '';
    this.requiredLetter = '';
    this.historyWords.clear();

    for (const player of this.players.values()) {
      player.isAlive = true;
      player.lives = 3;
      player.isReady = player.userId === this.hostUserId;
      player.wordsSubmitted = 0;
      player.placement = undefined;
    }

    this.notifyStateChange();
    return true;
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
      language: this.language,
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
