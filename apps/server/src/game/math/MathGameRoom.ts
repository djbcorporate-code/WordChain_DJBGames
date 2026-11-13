import {
  GameMode,
  MATH_PICK_DURATION_SEC,
  MATH_PLACEMENT_POINTS,
  MATH_RACE_DURATION_SEC,
  MATH_ROUND_RESULT_DELAY_MS,
  MATH_TOTAL_ROUNDS,
  MathOperation,
  MathOperationMode,
  MathPhase,
  MathPlayerInGame,
  MathPlayerPickDisplay,
  MathRoomSummary,
  MathRoundResultPayload,
  MathRoundState,
  RoomChatMessage,
  RoomStatus,
} from '@wordchain/shared';
import crypto from 'crypto';
import { TurnTimer } from '../TurnTimer.js';
import { MathEquationGenerator } from './MathEquationGenerator.js';

export interface MathGameRoomCallbacks {
  onStateChange?: (summary: MathRoomSummary) => void;
  onRoundPickStart?: (payload: {
    roundNumber: number;
    totalRounds: number;
    operation: MathOperation;
    pickOptions: number[];
    durationSec: number;
    deadlineUtc: number;
    serverNowUtc: number;
  }) => void;
  onPlayerPicked?: (payload: { userId: string }) => void;
  onRoundRaceStart?: (payload: {
    roundNumber: number;
    totalRounds: number;
    operation: MathOperation;
    picks: MathPlayerPickDisplay[];
    equationDisplay: string;
    choices?: string[];
    durationSec: number;
    deadlineUtc: number;
    serverNowUtc: number;
  }) => void;
  onPlayerSolved?: (payload: {
    userId: string;
    username: string;
    placement: number;
    pointsEarned: number;
    totalScore: number;
    solveTimeMs: number;
  }) => void;
  onAnswerRejected?: (payload: {
    userId: string;
    reason: 'WRONG_ANSWER' | 'LOCKED_OUT' | 'ALREADY_SOLVED' | 'NOT_RACING';
    message: string;
    lockedOut: boolean;
  }) => void;
  onRoundEnded?: (payload: MathRoundResultPayload) => void;
  onMatchEnded?: (payload: { winnerId: string; standings: MathPlayerInGame[] }) => void;
}

export interface MathGameRoomOptions {
  roomId?: string;
  roomCode?: string;
  mode: GameMode;
  operationMode?: MathOperationMode;
  hostUserId: string;
  maxPlayers?: number;
  raceDurationSec?: number;
  resultDelayMs?: number;
  callbacks?: MathGameRoomCallbacks;
}

export class MathGameRoom {
  public readonly roomId: string;
  public readonly roomCode: string;
  public readonly gameType = 'MATHRACE' as const;
  public readonly mode: GameMode;
  public readonly operationMode: MathOperationMode;
  public readonly createdAt: number = Date.now();
  public hostUserId: string;

  public status: RoomStatus = 'WAITING';
  public phase: MathPhase = 'WAITING';
  public players: Map<string, MathPlayerInGame> = new Map();
  public roundNumber: number = 0;
  public readonly totalRounds: number = MATH_TOTAL_ROUNDS;
  public maxPlayers: number;
  public readonly raceDurationSec: number;
  private readonly resultDelayMs: number;

  private operationSchedule: MathOperation[] = [];
  private currentOperation: MathOperation = 'ADD';
  private currentPickOptions: number[] = [];
  private currentPicks: MathPlayerPickDisplay[] = [];
  private currentEquationDisplay: string = '';
  private currentCorrectAnswer: string = '';
  private currentChoices: string[] | undefined = undefined;
  private roundSolvedCount: number = 0;
  private raceStartTimestamp: number = 0;

  private chatMessages: RoomChatMessage[] = [];
  private activeTimer: TurnTimer | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private nextRoundTimer: NodeJS.Timeout | null = null;
  private botTimeouts: NodeJS.Timeout[] = [];
  private callbacks: MathGameRoomCallbacks;

  constructor(options: MathGameRoomOptions) {
    this.roomId = options.roomId || crypto.randomUUID();
    this.roomCode = options.roomCode || this.generateRoomCode();
    this.mode = options.mode;
    this.operationMode = options.operationMode || 'MIXED';
    this.hostUserId = options.hostUserId;
    this.maxPlayers = Math.min(6, Math.max(2, options.maxPlayers || 6));
    this.raceDurationSec = Math.min(120, Math.max(8, options.raceDurationSec || MATH_RACE_DURATION_SEC));
    this.resultDelayMs = options.resultDelayMs ?? MATH_ROUND_RESULT_DELAY_MS;
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

  public addPlayer(player: {
    userId: string;
    username: string;
    avatarId: string;
    tier: any;
    division: number;
    isReady?: boolean;
  }): boolean {
    if (this.status !== 'WAITING') return false;
    if (this.players.size >= this.maxPlayers) return false;
    if (this.players.has(player.userId)) return false;

    this.players.set(player.userId, {
      userId: player.userId,
      username: player.username,
      avatarId: player.avatarId,
      tier: player.tier,
      division: player.division,
      isReady: player.isReady ?? player.userId === this.hostUserId,
      isDisconnected: false,
      score: 0,
      hasPicked: false,
      solvedThisRound: false,
      lockedOutThisRound: false,
      totalSolveTimeMs: 0,
      firstPlaceFinishes: 0,
    });

    this.notifyStateChange();
    return true;
  }

  public removePlayer(userId: string): { wasHost: boolean; newHostId?: string; shouldClose: boolean } {
    const wasHost = this.hostUserId === userId;
    this.players.delete(userId);

    const remainingPlayers = Array.from(this.players.values());
    const remainingHumans = remainingPlayers.filter((p) => !p.userId.startsWith('guest-bot-'));
    if (remainingPlayers.length === 0 || (this.status === 'WAITING' && remainingHumans.length === 0)) {
      this.cleanup();
      return { wasHost, shouldClose: true };
    }

    let newHostId: string | undefined;
    if (wasHost && remainingPlayers.length > 0) {
      newHostId = remainingHumans[0]?.userId || remainingPlayers[0].userId;
      this.hostUserId = newHostId;
      const newHost = this.players.get(newHostId);
      if (newHost && this.status === 'WAITING') {
        newHost.isReady = true;
      }
    }

    if (this.status === 'IN_PROGRESS') {
      if (remainingHumans.length === 0 || remainingPlayers.length < 2) {
        this.finishMatch();
      } else {
        this.checkPhaseCompletionAfterPlayerChange();
      }
    }

    this.notifyStateChange();
    return { wasHost, newHostId, shouldClose: false };
  }

  public kickPlayer(hostUserId: string, targetUserId: string): { success: boolean; error?: string; kickedPlayer?: MathPlayerInGame } {
    if (this.mode !== 'PRIVATE' || this.status !== 'WAITING') {
      return { success: false, error: 'Players can only be kicked inside a waiting private room.' };
    }
    if (this.hostUserId !== hostUserId) {
      return { success: false, error: 'Only the host can kick players.' };
    }
    if (hostUserId === targetUserId) {
      return { success: false, error: 'Host cannot kick themselves.' };
    }
    const target = this.players.get(targetUserId);
    if (!target) {
      return { success: false, error: 'Player not found in room.' };
    }

    this.players.delete(targetUserId);
    this.notifyStateChange();
    return { success: true, kickedPlayer: target };
  }

  public addChatMessage(msg: RoomChatMessage): void {
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 50) {
      this.chatMessages.shift();
    }
  }

  public getChatHistory(): RoomChatMessage[] {
    return [...this.chatMessages];
  }

  public setPlayerReady(userId: string, isReady: boolean): void {
    const player = this.players.get(userId);
    if (!player || this.status !== 'WAITING') return;
    player.isReady = isReady;
    this.notifyStateChange();
  }

  public startCountdown(): void {
    if (this.status !== 'WAITING') return;
    this.status = 'COUNTDOWN';
    this.phase = 'COUNTDOWN';
    this.notifyStateChange();

    this.countdownTimer = setTimeout(() => {
      this.startMatch();
    }, 3000);
  }

  public startMatch(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.players.size < 2) return;

    this.status = 'IN_PROGRESS';
    this.roundNumber = 0;
    this.operationSchedule = MathEquationGenerator.buildOperationSchedule(this.operationMode, this.totalRounds);

    for (const player of this.players.values()) {
      player.score = 0;
      player.hasPicked = false;
      player.pickedNumber = undefined;
      player.solvedThisRound = false;
      player.roundPlacement = undefined;
      player.roundPointsEarned = undefined;
      player.lockedOutThisRound = false;
      player.totalSolveTimeMs = 0;
      player.firstPlaceFinishes = 0;
      player.placement = undefined;
    }

    this.startNextRound();
  }

  private startNextRound(): void {
    if (this.status !== 'IN_PROGRESS') return;

    this.clearTimers();

    if (this.roundNumber >= this.totalRounds) {
      this.finishMatch();
      return;
    }

    this.roundNumber += 1;
    this.phase = 'PICKING';
    this.currentOperation = this.operationSchedule[this.roundNumber - 1] || 'ADD';
    this.currentPickOptions = MathEquationGenerator.generatePickOptions();
    this.currentPicks = [];
    this.currentEquationDisplay = '';
    this.currentCorrectAnswer = '';
    this.currentChoices = undefined;
    this.roundSolvedCount = 0;

    for (const player of this.players.values()) {
      player.hasPicked = false;
      player.pickedNumber = undefined;
      player.solvedThisRound = false;
      player.roundPlacement = undefined;
      player.roundPointsEarned = undefined;
      player.lockedOutThisRound = false;
    }

    this.activeTimer = new TurnTimer({
      durationMs: MATH_PICK_DURATION_SEC * 1000,
      gracePeriodMs: 350,
      onTimeout: () => this.handlePickTimeout(),
    });
    this.activeTimer.start();

    const deadlineUtc = this.activeTimer.getDeadlineUtc();
    const serverNowUtc = Date.now();

    this.callbacks.onRoundPickStart?.({
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      operation: this.currentOperation,
      pickOptions: [...this.currentPickOptions],
      durationSec: MATH_PICK_DURATION_SEC,
      deadlineUtc,
      serverNowUtc,
    });
    this.notifyStateChange();

    // Schedule automated bot picks
    for (const player of this.players.values()) {
      if (player.userId.startsWith('guest-bot-') || player.isDisconnected) {
        const delayMs = 500 + Math.floor(Math.random() * 1400);
        const t = setTimeout(() => {
          if (this.status === 'IN_PROGRESS' && this.phase === 'PICKING') {
            const choice = this.currentPickOptions[Math.floor(Math.random() * this.currentPickOptions.length)];
            this.submitPick(player.userId, choice);
          }
        }, delayMs);
        this.botTimeouts.push(t);
      }
    }
  }

  public submitPick(userId: string, chosenNumber: number): { success: boolean; reason?: string } {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'PICKING') {
      return { success: false, reason: 'NOT_PICKING_PHASE' };
    }

    const player = this.players.get(userId);
    if (!player) return { success: false, reason: 'PLAYER_NOT_IN_ROOM' };
    if (player.hasPicked) return { success: false, reason: 'ALREADY_PICKED' };

    if (!this.currentPickOptions.includes(chosenNumber)) {
      return { success: false, reason: 'INVALID_PICK_OPTION' };
    }

    player.hasPicked = true;
    player.pickedNumber = chosenNumber;
    this.callbacks.onPlayerPicked?.({ userId });

    // Check if every player has picked -> advance straight into Race!
    const allPicked = Array.from(this.players.values()).every((p) => p.hasPicked || p.isDisconnected);
    if (allPicked) {
      this.beginRacePhase();
    } else {
      this.notifyStateChange();
    }

    return { success: true };
  }

  private handlePickTimeout(): void {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'PICKING') return;
    this.beginRacePhase();
  }

  private beginRacePhase(): void {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'PICKING') return;

    this.clearTimers();

    // Auto-pick random offered numbers for anyone who hasn't picked
    for (const player of this.players.values()) {
      if (!player.hasPicked || player.pickedNumber === undefined) {
        const randomOpt = this.currentPickOptions[Math.floor(Math.random() * this.currentPickOptions.length)];
        player.hasPicked = true;
        player.pickedNumber = randomOpt;
      }
    }

    this.currentPicks = Array.from(this.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      number: p.pickedNumber!,
    }));

    const generated = MathEquationGenerator.buildEquation(this.currentPicks, this.currentOperation);
    this.currentEquationDisplay = generated.equationDisplay;
    this.currentCorrectAnswer = generated.correctAnswer;
    this.currentChoices = generated.choices;
    this.phase = 'RACING';
    this.raceStartTimestamp = Date.now();

    this.activeTimer = new TurnTimer({
      durationMs: this.raceDurationSec * 1000,
      gracePeriodMs: 400,
      onTimeout: () => this.endCurrentRound(),
    });
    this.activeTimer.start();

    const deadlineUtc = this.activeTimer.getDeadlineUtc();
    const serverNowUtc = Date.now();

    this.callbacks.onRoundRaceStart?.({
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      operation: this.currentOperation,
      picks: [...this.currentPicks],
      equationDisplay: this.currentEquationDisplay,
      choices: this.currentChoices ? [...this.currentChoices] : undefined,
      durationSec: this.raceDurationSec,
      deadlineUtc,
      serverNowUtc,
    });
    this.notifyStateChange();

    // Schedule AI Math Bot answers
    for (const player of this.players.values()) {
      if (player.userId.startsWith('guest-bot-')) {
        const baseDelay = this.currentOperation === 'MULTIPLY' || this.currentOperation === 'DIVIDE' ? 3600 : 2500;
        const solveDelayMs = baseDelay + Math.floor(Math.random() * 4800);
        const t = setTimeout(() => {
          if (this.status === 'IN_PROGRESS' && this.phase === 'RACING' && !player.solvedThisRound && !player.lockedOutThisRound) {
            // Bots have ~82% accuracy; on Division wrong choice locks out naturally
            const shouldMiss = Math.random() < 0.18;
            if (shouldMiss) {
              const wrongChoice = this.currentChoices?.find((c) => c !== this.currentCorrectAnswer) || '999999';
              this.submitAnswer(player.userId, wrongChoice);
            } else {
              this.submitAnswer(player.userId, this.currentCorrectAnswer);
            }
          }
        }, solveDelayMs);
        this.botTimeouts.push(t);
      }
    }
  }

  public submitAnswer(userId: string, rawAnswer: string): { success: boolean; lockedOut?: boolean; reason?: string } {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'RACING') {
      this.callbacks.onAnswerRejected?.({
        userId,
        reason: 'NOT_RACING',
        message: 'Waiting for the equation phase to begin.',
        lockedOut: false,
      });
      return { success: false, reason: 'NOT_RACING' };
    }

    const player = this.players.get(userId);
    if (!player) return { success: false, reason: 'PLAYER_NOT_IN_ROOM' };

    if (player.solvedThisRound) {
      this.callbacks.onAnswerRejected?.({
        userId,
        reason: 'ALREADY_SOLVED',
        message: 'You already solved this round!',
        lockedOut: false,
      });
      return { success: false, reason: 'ALREADY_SOLVED' };
    }

    if (player.lockedOutThisRound) {
      this.callbacks.onAnswerRejected?.({
        userId,
        reason: 'LOCKED_OUT',
        message: 'Locked out for this round after a wrong Division choice!',
        lockedOut: true,
      });
      return { success: false, lockedOut: true, reason: 'LOCKED_OUT' };
    }

    const isCorrect = MathEquationGenerator.isAnswerCorrect(rawAnswer, this.currentCorrectAnswer, this.currentOperation);

    if (!isCorrect) {
      const shouldLockOut = this.currentOperation === 'DIVIDE';
      if (shouldLockOut) {
        player.lockedOutThisRound = true;
      }

      this.callbacks.onAnswerRejected?.({
        userId,
        reason: shouldLockOut ? 'LOCKED_OUT' : 'WRONG_ANSWER',
        message: shouldLockOut
          ? 'Wrong choice! Locked out until the next round.'
          : 'Incorrect answer — try again!',
        lockedOut: shouldLockOut,
      });

      if (shouldLockOut) {
        this.checkRaceCompletion();
      }

      return { success: false, lockedOut: shouldLockOut, reason: 'WRONG_ANSWER' };
    }

    // Correct!
    const solveTimeMs = Math.max(50, Date.now() - this.raceStartTimestamp);
    this.roundSolvedCount += 1;
    const roundPlacement = this.roundSolvedCount;
    const pointsEarned = MATH_PLACEMENT_POINTS[Math.min(roundPlacement - 1, MATH_PLACEMENT_POINTS.length - 1)] ?? 25;

    player.solvedThisRound = true;
    player.roundPlacement = roundPlacement;
    player.roundPointsEarned = pointsEarned;
    player.score += pointsEarned;
    player.totalSolveTimeMs += solveTimeMs;
    if (roundPlacement === 1) {
      player.firstPlaceFinishes += 1;
    }

    this.callbacks.onPlayerSolved?.({
      userId,
      username: player.username,
      placement: roundPlacement,
      pointsEarned,
      totalScore: player.score,
      solveTimeMs,
    });

    this.checkRaceCompletion();
    return { success: true };
  }

  private checkRaceCompletion(): void {
    const activePlayers = Array.from(this.players.values()).filter((p) => !p.isDisconnected);
    const allFinished = activePlayers.every((p) => p.solvedThisRound || p.lockedOutThisRound);
    if (allFinished) {
      this.endCurrentRound();
    } else {
      this.notifyStateChange();
    }
  }

  private checkPhaseCompletionAfterPlayerChange(): void {
    if (this.phase === 'PICKING') {
      const allPicked = Array.from(this.players.values()).every((p) => p.hasPicked || p.isDisconnected);
      if (allPicked) {
        this.beginRacePhase();
      }
    } else if (this.phase === 'RACING') {
      this.checkRaceCompletion();
    }
  }

  private endCurrentRound(): void {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'RACING') return;

    this.clearTimers();
    this.phase = 'ROUND_RESULT';

    const standings = this.getSortedStandings();

    this.callbacks.onRoundEnded?.({
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      operation: this.currentOperation,
      equationDisplay: this.currentEquationDisplay,
      correctAnswer: this.currentCorrectAnswer,
      picks: [...this.currentPicks],
      standings,
    });

    this.notifyStateChange();

    if (this.roundNumber >= this.totalRounds) {
      this.nextRoundTimer = setTimeout(() => {
        this.finishMatch();
      }, this.resultDelayMs);
    } else {
      this.nextRoundTimer = setTimeout(() => {
        this.startNextRound();
      }, this.resultDelayMs);
    }
  }

  public getSortedStandings(): MathPlayerInGame[] {
    return Array.from(this.players.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.totalSolveTimeMs !== b.totalSolveTimeMs) return a.totalSolveTimeMs - b.totalSolveTimeMs;
        return b.firstPlaceFinishes - a.firstPlaceFinishes;
      })
      .map((p, idx) => ({
        ...p,
        placement: idx + 1,
      }));
  }

  private finishMatch(): void {
    if (this.status === 'FINISHED') return;

    this.clearTimers();
    this.status = 'FINISHED';
    this.phase = 'FINISHED';

    const standings = this.getSortedStandings();
    for (const s of standings) {
      const playerRef = this.players.get(s.userId);
      if (playerRef) {
        playerRef.placement = s.placement;
      }
    }

    const winnerId = standings[0]?.userId || '';
    this.notifyStateChange();
    this.callbacks.onMatchEnded?.({ winnerId, standings });
  }

  public resetToLobby(): boolean {
    if (this.status !== 'FINISHED' || this.mode !== 'PRIVATE') return false;

    this.clearTimers();
    this.status = 'WAITING';
    this.phase = 'WAITING';
    this.roundNumber = 0;
    this.currentPickOptions = [];
    this.currentPicks = [];
    this.currentEquationDisplay = '';
    this.currentCorrectAnswer = '';
    this.currentChoices = undefined;

    for (const player of this.players.values()) {
      player.isReady = player.userId === this.hostUserId;
      player.score = 0;
      player.hasPicked = false;
      player.pickedNumber = undefined;
      player.solvedThisRound = false;
      player.roundPlacement = undefined;
      player.roundPointsEarned = undefined;
      player.lockedOutThisRound = false;
      player.totalSolveTimeMs = 0;
      player.firstPlaceFinishes = 0;
      player.placement = undefined;
    }

    this.notifyStateChange();
    return true;
  }

  public getSummary(): MathRoomSummary {
    const durationMs = this.activeTimer?.getDurationMs() || MATH_PICK_DURATION_SEC * 1000;
    let roundState: MathRoundState | undefined;

    if (this.status === 'IN_PROGRESS') {
      roundState = {
        roundNumber: this.roundNumber,
        totalRounds: this.totalRounds,
        phase: this.phase,
        operation: this.currentOperation,
        pickOptions: this.phase === 'PICKING' ? [...this.currentPickOptions] : [],
        picks: this.phase !== 'PICKING' ? [...this.currentPicks] : undefined,
        equationDisplay: this.phase !== 'PICKING' ? this.currentEquationDisplay : undefined,
        choices: this.phase === 'RACING' ? this.currentChoices : undefined,
        phaseDurationSec: Math.round(durationMs / 1000),
        phaseDeadlineUtc: this.activeTimer?.getDeadlineUtc() || 0,
        serverNowUtc: Date.now(),
      };
    }

    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      gameType: 'MATHRACE',
      mode: this.mode,
      operationMode: this.operationMode,
      status: this.status,
      hostUserId: this.hostUserId,
      maxPlayers: this.maxPlayers,
      players: Array.from(this.players.values()).map((p) => ({
        ...p,
        // Never leak other players' pickedNumber before Reveal!
        pickedNumber: this.phase === 'PICKING' ? undefined : p.pickedNumber,
      })),
      roundState,
      chatHistory: this.getChatHistory(),
    };
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.getSummary());
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.nextRoundTimer) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
    this.activeTimer?.stop();
    this.activeTimer = null;
    for (const t of this.botTimeouts) {
      clearTimeout(t);
    }
    this.botTimeouts = [];
  }

  public cleanup(): void {
    this.clearTimers();
    this.players.clear();
  }
}
