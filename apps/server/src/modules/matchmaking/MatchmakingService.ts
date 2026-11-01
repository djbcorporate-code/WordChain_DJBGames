import {
  AuthSession,
  ClientToServerEvents,
  GameMode,
  PlayerInGame,
  ServerToClientEvents,
} from '@wordchain/shared';
import { Server, Socket } from 'socket.io';
import { GameRoom } from '../../game/GameRoom.js';
import { RoomManager } from '../../game/RoomManager.js';
import { AuthenticatedSocket } from '../../sockets/socketAuth.js';

interface QueuedPlayer {
  user: AuthSession;
  socket: AuthenticatedSocket;
  playerInfo: PlayerInGame;
  mode: GameMode;
  enqueuedAt: number;
}

export class MatchmakingService {
  private static instance: MatchmakingService | null = null;
  private queue: QueuedPlayer[] = [];
  private workerInterval: NodeJS.Timeout | null = null;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private bindCallbacksFn: ((room: GameRoom) => void) | null = null;

  public static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  public initialize(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    bindCallbacks: (room: GameRoom) => void
  ): void {
    this.io = io;
    this.bindCallbacksFn = bindCallbacks;

    if (!this.workerInterval) {
      this.workerInterval = setInterval(() => this.processQueue(), 1000);
    }
  }

  public enqueue(
    user: AuthSession,
    socket: AuthenticatedSocket,
    playerInfo: PlayerInGame,
    mode: GameMode = 'CASUAL'
  ): void {
    // Check if already in queue
    const existingIndex = this.queue.findIndex((p) => p.user.userId === user.userId);
    if (existingIndex !== -1) {
      this.queue[existingIndex].socket = socket;
      return;
    }

    this.queue.push({
      user,
      socket,
      playerInfo,
      mode,
      enqueuedAt: Date.now(),
    });

    socket.emit('QUEUE_STATUS', {
      inQueue: true,
      mode,
      position: this.queue.length,
      estimatedWaitSec: 3,
    });

    // Check immediately if we can form a match
    this.processQueue();
  }

  public dequeue(userId: string): void {
    const index = this.queue.findIndex((p) => p.user.userId === userId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      removed.socket.emit('QUEUE_STATUS', { inQueue: false });
    }
  }

  public isQueued(userId: string): boolean {
    return this.queue.some((p) => p.user.userId === userId);
  }

  private processQueue(): void {
    if (this.queue.length === 0 || !this.io || !this.bindCallbacksFn) return;

    // Filter out disconnected sockets
    this.queue = this.queue.filter((p) => p.socket.connected);

    // Filter casual players
    const casualQueue = this.queue.filter((p) => p.mode === 'CASUAL');

    // Rule 1: Instant match if 4 players are in queue
    // Rule 2: Match 2 or 3 players if oldest player has waited >= 2.5 seconds
    const oldestWaitMs = casualQueue.length > 0 ? Date.now() - casualQueue[0].enqueuedAt : 0;
    const shouldStartWithFewer = casualQueue.length >= 2 && oldestWaitMs >= 2500;
    const hasFullRoom = casualQueue.length >= 4;

    if (hasFullRoom || shouldStartWithFewer) {
      const batchSize = Math.min(4, casualQueue.length);
      const matchedBatch = casualQueue.slice(0, batchSize);

      // Remove from queue
      for (const matched of matchedBatch) {
        const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
        if (idx !== -1) this.queue.splice(idx, 1);
      }

      this.createCasualMatch(matchedBatch);
      return;
    }

    // Broadcast updated queue positions to remaining players
    casualQueue.forEach((p, idx) => {
      p.socket.emit('QUEUE_STATUS', {
        inQueue: true,
        mode: 'CASUAL',
        position: idx + 1,
        estimatedWaitSec: Math.max(1, 3 - Math.floor((Date.now() - p.enqueuedAt) / 1000)),
      });
    });
  }

  private createCasualMatch(players: QueuedPlayer[]): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];

    const room = roomManager.createRoom({
      mode: 'CASUAL',
      hostUserId: host.user.userId,
      startTimerSec: 15,
      minTimerSec: 8,
      maxPlayers: 4,
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        ...p.playerInfo,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        mode: 'CASUAL',
        countdownSec: 3,
      });
    }

    this.io!.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());

    // Start 3-second pre-match countdown
    room.startCountdown();
    console.log(`[Matchmaking] Casual match created: ${room.roomCode} with ${players.length} scholars`);
  }

  public cleanup(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.queue = [];
  }
}
