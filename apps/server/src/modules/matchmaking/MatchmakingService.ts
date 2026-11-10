import {
  AuthSession,
  ClientToServerEvents,
  GameLanguage,
  GameMode,
  PlayerInGame,
  ServerToClientEvents,
} from '@wordchain/shared';
import { Server, Socket } from 'socket.io';
import { GameRoom } from '../../game/GameRoom.js';
import { RoomManager } from '../../game/RoomManager.js';
import { AuthenticatedSocket } from '../../sockets/socketAuth.js';
import { RankingService } from '../ranking/RankingService.js';

interface QueuedPlayer {
  user: AuthSession;
  socket: AuthenticatedSocket;
  playerInfo: PlayerInGame;
  mode: GameMode;
  language: GameLanguage;
  mmr: number;
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

  public async enqueue(
    user: AuthSession,
    socket: AuthenticatedSocket,
    playerInfo: PlayerInGame,
    mode: GameMode = 'CASUAL',
    mmr: number = 1000,
    language: GameLanguage = 'ENGLISH'
  ): Promise<boolean> {
    // Check Ranked eligibility if queuing for Ranked
    if (mode === 'RANKED') {
      const eligibility = await RankingService.checkRankedEligibility(user.userId);
      if (!eligibility.eligible) {
        socket.emit('SOCKET_ERROR', {
          code: 'RANKED_NOT_ELIGIBLE',
          message: eligibility.reason || 'You are not eligible for Ranked matches.',
        });
        return false;
      }
    }

    // Check if already in queue
    const existingIndex = this.queue.findIndex((p) => p.user.userId === user.userId);
    if (existingIndex !== -1) {
      this.queue[existingIndex].socket = socket;
      this.queue[existingIndex].language = language;
      return true;
    }

    this.queue.push({
      user,
      socket,
      playerInfo,
      mode,
      language,
      mmr,
      enqueuedAt: Date.now(),
    });

    socket.emit('QUEUE_STATUS', {
      inQueue: true,
      mode,
      language,
      position: this.queue.filter((p) => p.mode === mode && p.language === language).length,
      estimatedWaitSec: mode === 'RANKED' ? 10 : 3,
    });

    // Check immediately if we can form a match
    this.processQueue();
    return true;
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

    this.processCasualQueue();
    this.processRankedQueue();
  }

  private processCasualQueue(): void {
    const casualQueue = this.queue.filter((p) => p.mode === 'CASUAL');
    if (casualQueue.length === 0) return;

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

  private processRankedQueue(): void {
    const languages: GameLanguage[] = ['ENGLISH', 'TAGALOG', 'BISAYA'];
    for (const lang of languages) {
      this.processRankedQueueForLanguage(lang);
    }
  }

  private processRankedQueueForLanguage(lang: GameLanguage): void {
    const rankedQueue = this.queue.filter((p) => p.mode === 'RANKED' && p.language === lang);
    if (rankedQueue.length < 2) {
      // Minimum 2 scholars required for Ranked match in this language
      rankedQueue.forEach((p, idx) => {
        p.socket.emit('QUEUE_STATUS', {
          inQueue: true,
          mode: 'RANKED',
          language: lang,
          position: idx + 1,
          estimatedWaitSec: Math.max(3, 10 - Math.floor((Date.now() - p.enqueuedAt) / 1000)),
        });
      });
      return;
    }

    // Sort by MMR to find closely matched scholars
    const sorted = [...rankedQueue].sort((a, b) => a.mmr - b.mmr);
    const now = Date.now();

    // Strategy 1: Check for 4-player FFA if 4+ players queued and MMR tolerance matches
    if (sorted.length >= 4) {
      for (let i = 0; i <= sorted.length - 4; i++) {
        const pod = sorted.slice(i, i + 4);
        const minMmr = pod[0].mmr;
        const maxMmr = pod[3].mmr;
        const mmrSpread = maxMmr - minMmr;
        const maxWait = Math.max(...pod.map((p) => now - p.enqueuedAt));
        const allowedTolerance = Math.min(300, 100 + Math.floor(maxWait / 5000) * 50);

        if (mmrSpread <= allowedTolerance) {
          for (const matched of pod) {
            const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
            if (idx !== -1) this.queue.splice(idx, 1);
          }

          this.createRankedMatch(pod, lang);
          return;
        }
      }
    }

    // Strategy 2: Match 2 players (1v1 Ranked Duel) if oldest queued player has waited >= 2.5 seconds
    const oldestWaitMs = now - sorted[0].enqueuedAt;
    const shouldMatchPair = oldestWaitMs >= 2500;

    if (shouldMatchPair) {
      for (let i = 0; i <= sorted.length - 2; i++) {
        const pair = sorted.slice(i, i + 2);
        const mmrSpread = Math.abs(pair[1].mmr - pair[0].mmr);
        const maxWait = Math.max(now - pair[0].enqueuedAt, now - pair[1].enqueuedAt);
        const allowedTolerance = Math.min(400, 150 + Math.floor(maxWait / 2000) * 50);

        if (mmrSpread <= allowedTolerance || maxWait >= 4000) {
          for (const matched of pair) {
            const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
            if (idx !== -1) this.queue.splice(idx, 1);
          }

          this.createRankedMatch(pair, lang);
          return;
        }
      }
    }

    // Broadcast queue status to ranked players of this language
    rankedQueue.forEach((p, idx) => {
      p.socket.emit('QUEUE_STATUS', {
        inQueue: true,
        mode: 'RANKED',
        language: lang,
        position: idx + 1,
        estimatedWaitSec: Math.max(2, 6 - Math.floor((Date.now() - p.enqueuedAt) / 1000)),
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
    room.startCountdown();
    console.log(`[Matchmaking] Casual match created: ${room.roomCode} with ${players.length} scholars`);
  }

  private createRankedMatch(players: QueuedPlayer[], language: GameLanguage = 'ENGLISH'): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];

    const room = roomManager.createRoom({
      mode: 'RANKED',
      language,
      hostUserId: host.user.userId,
      startTimerSec: 15,
      minTimerSec: 6, // Competitive floor: 6s
      maxPlayers: players.length,
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
        mode: 'RANKED',
        language,
        countdownSec: 3,
      });
    }

    this.io!.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
    room.startCountdown();
    console.log(
      `[Matchmaking] Ranked match (${language}) created: ${room.roomCode} with ${players.length} scholars (avg MMR: ${Math.round(
        players.reduce((sum, p) => sum + p.mmr, 0) / players.length
      )})`
    );
  }

  public cleanup(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.queue = [];
  }
}

