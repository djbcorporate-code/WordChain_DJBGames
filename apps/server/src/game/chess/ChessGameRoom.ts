import {
  applyChessMove,
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_DEFAULT_INCREMENT_SEC,
  CHESS_SEAT_META,
  ChessEndReason,
  ChessGameStateSnapshot,
  ChessMoveInput,
  ChessMoveRecord,
  ChessPlayerInGame,
  ChessRoomSummary,
  ChessVariant,
  chooseBestChessMove,
  createInitialChessState,
  eliminateSeatFromState,
  GameMode,
  RoomChatMessage,
  RoomStatus,
} from '@wordchain/shared';
import crypto from 'crypto';

export interface ChessGameRoomCallbacks {
  onStateChange?: (summary: ChessRoomSummary) => void;
  onCountdownTick?: (payload: { remainingSec: number }) => void;
  onMoveApplied?: (payload: {
    move: ChessMoveRecord;
    gameState: ChessGameStateSnapshot;
    turnStartedAtUtc: number;
    players: ChessPlayerInGame[];
  }) => void;
  onMoveRejected?: (payload: { userId: string; reason: string; message: string }) => void;
  onPlayerEliminated?: (payload: {
    userId: string;
    seat: number;
    placement: number;
    reason: ChessEndReason;
  }) => void;
  onMatchEnded?: (payload: {
    winnerId: string;
    isDraw?: boolean;
    drawReason?: ChessEndReason;
    standings: ChessPlayerInGame[];
  }) => void;
}

export interface ChessGameRoomOptions {
  roomId?: string;
  roomCode?: string;
  mode: GameMode;
  variant?: ChessVariant;
  clockSec?: number;
  incrementSec?: number;
  hostUserId: string;
  countdownDelayMs?: number;
  callbacks?: ChessGameRoomCallbacks;
}

export class ChessGameRoom {
  public readonly roomId: string;
  public readonly roomCode: string;
  public readonly gameType = 'CHESS' as const;
  public readonly mode: GameMode;
  public readonly variant: ChessVariant;
  public readonly maxPlayers: number;
  public readonly clockSec: number;
  public readonly incrementSec: number;
  public readonly createdAt: number = Date.now();
  public hostUserId: string;

  public status: RoomStatus = 'WAITING';
  public players: Map<string, ChessPlayerInGame> = new Map();
  public gameState: ChessGameStateSnapshot | null = null;
  public turnStartedAtUtc: number = 0;

  private chatMessages: RoomChatMessage[] = [];
  private activeClockTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private botTimer: NodeJS.Timeout | null = null;
  private readonly countdownDelayMs: number;
  private callbacks: ChessGameRoomCallbacks;

  constructor(options: ChessGameRoomOptions) {
    this.roomId = options.roomId || crypto.randomUUID();
    this.roomCode = options.roomCode || this.generateRoomCode();
    this.mode = options.mode;
    this.variant = options.variant && ['2P', '3P', '4P'].includes(options.variant) ? options.variant : '2P';
    this.maxPlayers = this.variant === '4P' ? 4 : this.variant === '3P' ? 3 : 2;
    this.clockSec = Math.min(1800, Math.max(60, options.clockSec ?? CHESS_DEFAULT_CLOCK_SEC));
    this.incrementSec = Math.min(30, Math.max(0, options.incrementSec ?? CHESS_DEFAULT_INCREMENT_SEC));
    this.hostUserId = options.hostUserId;
    this.countdownDelayMs = options.countdownDelayMs ?? 3000;
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

  private getOrderedPlayers(): ChessPlayerInGame[] {
    return Array.from(this.players.values()).sort((a, b) => a.seat - b.seat);
  }

  private findFreeSeat(): number {
    const taken = new Set(Array.from(this.players.values()).map((p) => p.seat));
    for (let s = 0; s < this.maxPlayers; s++) {
      if (!taken.has(s)) return s;
    }
    return -1;
  }

  public addPlayer(player: {
    userId: string;
    username: string;
    avatarId: string;
    tier: ChessPlayerInGame['tier'];
    division: number;
    isReady: boolean;
  }): boolean {
    if (this.status !== 'WAITING') return false;
    if (this.players.has(player.userId)) return false;
    const seat = this.findFreeSeat();
    if (seat === -1) return false;

    const seatMeta = CHESS_SEAT_META[this.variant][seat];
    this.players.set(player.userId, {
      userId: player.userId,
      username: player.username,
      avatarId: player.avatarId,
      tier: player.tier,
      division: player.division,
      seat,
      color: seatMeta.color,
      isReady: player.isReady,
      isAlive: true,
      isDisconnected: false,
      timeRemainingMs: this.clockSec * 1000,
      movesPlayed: 0,
      capturesCount: 0,
    });

    this.notifyStateChange();
    return true;
  }

  public removePlayer(userId: string): { wasHost?: boolean; newHostId?: string; shouldClose: boolean } {
    const player = this.players.get(userId);
    if (!player) return { shouldClose: false };

    const wasHost = this.hostUserId === userId;

    if (this.status === 'IN_PROGRESS' && this.gameState) {
      if (player.isAlive) {
        this.resignPlayer(userId, 'FORFEIT');
      }
      const remainingHumans = Array.from(this.players.values()).filter(
        (p) => !p.userId.startsWith('guest-bot-') && !p.isDisconnected && p.userId !== userId
      );
      if (remainingHumans.length === 0) {
        this.cleanup();
        return { wasHost, shouldClose: true };
      }
      return { wasHost, shouldClose: false };
    }

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

    this.notifyStateChange();
    return { wasHost, newHostId, shouldClose: false };
  }

  public kickPlayer(
    requesterId: string,
    targetUserId: string
  ): { success: boolean; error?: string; kickedPlayer?: ChessPlayerInGame } {
    if (this.mode !== 'PRIVATE' || this.status !== 'WAITING') {
      return { success: false, error: 'Kicking is only allowed in waiting private rooms.' };
    }
    if (this.hostUserId !== requesterId) {
      return { success: false, error: 'Only the room creator can remove players.' };
    }
    if (requesterId === targetUserId) {
      return { success: false, error: 'You cannot kick yourself.' };
    }
    const target = this.players.get(targetUserId);
    if (!target) {
      return { success: false, error: 'Player not found in this room.' };
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
    if (this.status !== 'WAITING') return;
    const player = this.players.get(userId);
    if (!player) return;
    player.isReady = isReady;
    this.notifyStateChange();
  }

  public startCountdown(): void {
    if (this.status !== 'WAITING' || this.players.size < 2) return;
    this.status = 'COUNTDOWN';
    this.notifyStateChange();

    let remaining = Math.ceil(this.countdownDelayMs / 1000);
    this.callbacks.onCountdownTick?.({ remainingSec: remaining });

    if (this.countdownDelayMs <= 0) {
      this.startMatch();
      return;
    }

    const tick = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.callbacks.onCountdownTick?.({ remainingSec: remaining });
      }
    }, 1000);

    this.countdownTimer = setTimeout(() => {
      clearInterval(tick);
      if (this.status === 'COUNTDOWN') {
        this.startMatch();
      }
    }, this.countdownDelayMs);
  }

  public startMatch(): void {
    if (this.players.size < this.maxPlayers) return;
    this.clearTimers();

    this.status = 'IN_PROGRESS';
    this.gameState = createInitialChessState(this.variant);
    this.turnStartedAtUtc = Date.now();

    for (const p of this.players.values()) {
      p.isAlive = true;
      p.timeRemainingMs = this.clockSec * 1000;
      p.movesPlayed = 0;
      p.capturesCount = 0;
      p.placement = undefined;
      p.eliminatedReason = undefined;
    }

    this.notifyStateChange();
    this.scheduleClockAndBotForActiveSeat();
  }

  private getPlayerBySeat(seat: number): ChessPlayerInGame | undefined {
    for (const p of this.players.values()) {
      if (p.seat === seat) return p;
    }
    return undefined;
  }

  private scheduleClockAndBotForActiveSeat(): void {
    this.clearClockAndBotTimers();
    if (this.status !== 'IN_PROGRESS' || !this.gameState) return;
    if (this.gameState.winnerSeat !== undefined || this.gameState.isDraw) return;

    const activePlayer = this.getPlayerBySeat(this.gameState.activeSeat);
    if (!activePlayer || !activePlayer.isAlive) return;

    const remainingMs = Math.max(50, activePlayer.timeRemainingMs);
    this.activeClockTimer = setTimeout(() => {
      this.handleSeatFlag(activePlayer.seat);
    }, remainingMs);

    if (activePlayer.userId.startsWith('guest-bot-')) {
      const thinkDelay = Math.min(remainingMs - 40, 850 + Math.floor(Math.random() * 850));
      const delayMs = Math.max(120, thinkDelay);
      this.botTimer = setTimeout(() => {
        if (
          this.status === 'IN_PROGRESS' &&
          this.gameState &&
          this.gameState.activeSeat === activePlayer.seat
        ) {
          const bestMove = chooseBestChessMove(this.gameState, activePlayer.seat);
          if (bestMove) {
            this.submitMove(activePlayer.userId, bestMove);
          } else {
            this.handleSeatFlag(activePlayer.seat);
          }
        }
      }, delayMs);
    }
  }

  public submitMove(
    userId: string,
    input: ChessMoveInput
  ): { success: boolean; reason?: string } {
    if (this.status !== 'IN_PROGRESS' || !this.gameState) {
      return { success: false, reason: 'GAME_NOT_ACTIVE' };
    }

    const player = this.players.get(userId);
    if (!player) return { success: false, reason: 'PLAYER_NOT_IN_ROOM' };
    if (!player.isAlive) {
      this.callbacks.onMoveRejected?.({
        userId,
        reason: 'PLAYER_ELIMINATED',
        message: 'You have already been eliminated.',
      });
      return { success: false, reason: 'PLAYER_ELIMINATED' };
    }
    if (player.seat !== this.gameState.activeSeat) {
      this.callbacks.onMoveRejected?.({
        userId,
        reason: 'NOT_YOUR_TURN',
        message: 'Wait for your turn to move.',
      });
      return { success: false, reason: 'NOT_YOUR_TURN' };
    }

    const now = Date.now();
    const elapsedMs = Math.max(0, now - this.turnStartedAtUtc);
    const updatedRemaining = player.timeRemainingMs - elapsedMs;
    if (updatedRemaining <= 0) {
      this.handleSeatFlag(player.seat);
      return { success: false, reason: 'CLOCK_EXPIRED' };
    }

    const prevAliveCount = Array.from(this.players.values()).filter((p) => p.isAlive).length;
    const result = applyChessMove(this.gameState, player.seat, input);

    if (!result.valid || !result.nextState || !result.moveRecord) {
      this.callbacks.onMoveRejected?.({
        userId,
        reason: result.reason || 'ILLEGAL_MOVE',
        message: `Illegal move (${result.reason || 'INVALID'}).`,
      });
      return { success: false, reason: result.reason || 'ILLEGAL_MOVE' };
    }

    this.clearClockAndBotTimers();

    player.timeRemainingMs = updatedRemaining + this.incrementSec * 1000;
    player.movesPlayed += 1;
    if (result.moveRecord.captured) {
      player.capturesCount += 1;
    }

    this.gameState = result.nextState;
    this.turnStartedAtUtc = Date.now();

    // Process any seats eliminated by checkmate / stalemate on this move
    let remainingAlive = prevAliveCount;
    for (const elimSeat of result.eliminatedSeatsThisMove || []) {
      const victim = this.getPlayerBySeat(elimSeat);
      if (victim && victim.isAlive) {
        victim.isAlive = false;
        victim.placement = remainingAlive;
        victim.eliminatedReason = 'CHECKMATE';
        remainingAlive -= 1;
        this.callbacks.onPlayerEliminated?.({
          userId: victim.userId,
          seat: victim.seat,
          placement: victim.placement,
          reason: 'CHECKMATE',
        });
      }
    }

    this.callbacks.onMoveApplied?.({
      move: result.moveRecord,
      gameState: this.gameState,
      turnStartedAtUtc: this.turnStartedAtUtc,
      players: this.getOrderedPlayers(),
    });

    if (this.gameState.winnerSeat !== undefined || this.gameState.isDraw) {
      this.finishMatch();
    } else {
      this.notifyStateChange();
      this.scheduleClockAndBotForActiveSeat();
    }

    return { success: true };
  }

  private handleSeatFlag(seat: number): void {
    if (this.status !== 'IN_PROGRESS' || !this.gameState) return;
    const player = this.getPlayerBySeat(seat);
    if (!player || !player.isAlive) return;

    player.timeRemainingMs = 0;
    this.eliminateParticipant(player, 'FLAGGED');
  }

  public resignPlayer(userId: string, reason: ChessEndReason = 'RESIGN'): boolean {
    if (this.status === 'WAITING') {
      this.removePlayer(userId);
      return true;
    }
    if (this.status !== 'IN_PROGRESS' || !this.gameState) return false;
    const player = this.players.get(userId);
    if (!player || !player.isAlive) return false;

    if (player.seat === this.gameState.activeSeat) {
      const elapsed = Math.max(0, Date.now() - this.turnStartedAtUtc);
      player.timeRemainingMs = Math.max(0, player.timeRemainingMs - elapsed);
    }

    this.eliminateParticipant(player, reason);
    return true;
  }

  private eliminateParticipant(player: ChessPlayerInGame, reason: ChessEndReason): void {
    if (!this.gameState || !player.isAlive) return;
    this.clearClockAndBotTimers();

    const aliveCount = Array.from(this.players.values()).filter((p) => p.isAlive).length;
    player.isAlive = false;
    player.placement = aliveCount;
    player.eliminatedReason = reason;

    const prevElimLen = this.gameState.eliminatedSeats.length;
    this.gameState = eliminateSeatFromState(this.gameState, player.seat);
    this.turnStartedAtUtc = Date.now();

    this.callbacks.onPlayerEliminated?.({
      userId: player.userId,
      seat: player.seat,
      placement: player.placement,
      reason,
    });

    // Also mark any cascading eliminations after piece removal
    const newElims = this.gameState.eliminatedSeats.slice(prevElimLen);
    let nextPlace = aliveCount - 1;
    for (const eSeat of newElims) {
      if (eSeat === player.seat) continue;
      const other = this.getPlayerBySeat(eSeat);
      if (other && other.isAlive) {
        other.isAlive = false;
        other.placement = nextPlace--;
        other.eliminatedReason = 'CHECKMATE';
        this.callbacks.onPlayerEliminated?.({
          userId: other.userId,
          seat: other.seat,
          placement: other.placement,
          reason: 'CHECKMATE',
        });
      }
    }

    if (this.gameState.winnerSeat !== undefined || this.gameState.isDraw) {
      this.finishMatch();
    } else {
      this.notifyStateChange();
      this.scheduleClockAndBotForActiveSeat();
    }
  }

  private finishMatch(): void {
    if (this.status === 'FINISHED' || !this.gameState) return;
    this.clearTimers();
    this.status = 'FINISHED';

    const isDraw = Boolean(this.gameState.isDraw);
    const drawReason = this.gameState.drawReason;
    const winnerSeat = this.gameState.winnerSeat;

    if (!isDraw && winnerSeat !== undefined) {
      const winPlayer = this.getPlayerBySeat(winnerSeat);
      if (winPlayer) {
        winPlayer.placement = 1;
        winPlayer.eliminatedReason = 'WINNER';
      }
    } else if (isDraw) {
      for (const p of this.players.values()) {
        p.placement = 1;
        p.eliminatedReason = drawReason || 'DRAW_STALEMATE';
      }
    }

    const standings = Array.from(this.players.values()).sort((a, b) => {
      const pa = a.placement ?? this.maxPlayers;
      const pb = b.placement ?? this.maxPlayers;
      if (pa !== pb) return pa - pb;
      if (b.capturesCount !== a.capturesCount) return b.capturesCount - a.capturesCount;
      return b.movesPlayed - a.movesPlayed;
    });

    const winnerId = isDraw ? '' : standings[0]?.userId || '';
    this.notifyStateChange();
    this.callbacks.onMatchEnded?.({
      winnerId,
      isDraw,
      drawReason,
      standings,
    });
  }

  public resetToLobby(): boolean {
    if (this.status !== 'FINISHED' || this.mode !== 'PRIVATE') return false;

    this.clearTimers();
    this.status = 'WAITING';
    this.gameState = null;
    this.turnStartedAtUtc = 0;

    for (const p of this.players.values()) {
      p.isReady = p.userId === this.hostUserId;
      p.isAlive = true;
      p.timeRemainingMs = this.clockSec * 1000;
      p.movesPlayed = 0;
      p.capturesCount = 0;
      p.placement = undefined;
      p.eliminatedReason = undefined;
    }

    this.notifyStateChange();
    return true;
  }

  public getSummary(): ChessRoomSummary {
    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      gameType: 'CHESS',
      variant: this.variant,
      mode: this.mode,
      status: this.status,
      hostUserId: this.hostUserId,
      maxPlayers: this.maxPlayers,
      clockSec: this.clockSec,
      incrementSec: this.incrementSec,
      turnStartedAtUtc: this.turnStartedAtUtc,
      players: this.getOrderedPlayers(),
      gameState: this.gameState ?? undefined,
      chatHistory: this.getChatHistory(),
    };
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.getSummary());
  }

  private clearClockAndBotTimers(): void {
    if (this.activeClockTimer) {
      clearTimeout(this.activeClockTimer);
      this.activeClockTimer = null;
    }
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearClockAndBotTimers();
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  public cleanup(): void {
    this.clearTimers();
    this.players.clear();
  }
}
