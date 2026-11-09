import { LexiconService } from '@wordchain/lexicon';
import { GameRoomSummary, GameTurnState } from '@wordchain/shared';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { closeDb, getDb } from '../../db/index.js';
import { generateJwt } from '../../utils/security.js';
import { socketAuthMiddleware } from '../socketAuth.js';
import { setupSocketRouter } from '../socketRouter.js';

describe('Real-Time Socket.IO & Private Room Integration Tests', () => {
  let httpServer: http.Server;
  let ioServer: Server;
  let port: number;

  const testUser1 = {
    userId: '11111111-1111-1111-1111-111111111111',
    username: 'HostScholar',
    role: 'USER' as const,
    emailVerified: true,
  };

  const testUser2 = {
    userId: '22222222-2222-2222-2222-222222222222',
    username: 'GuestScholar',
    role: 'USER' as const,
    emailVerified: true,
  };

  let token1: string;
  let token2: string;

  beforeAll(async () => {
    await getDb();
    await LexiconService.getInstance().initialize();

    token1 = generateJwt(testUser1);
    token2 = generateJwt(testUser2);

    httpServer = http.createServer(app);
    ioServer = new Server(httpServer, {
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    ioServer.use(socketAuthMiddleware);
    setupSocketRouter(ioServer as any);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 4001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await closeDb();
  });

  it('should reject unauthenticated socket connection', async () => {
    const unauthSocket = Client(`http://localhost:${port}`, {
      autoConnect: true,
      transports: ['websocket'],
    });

    const errorPromise = new Promise<string>((resolve) => {
      unauthSocket.on('connect_error', (err) => {
        resolve(err.message);
        unauthSocket.disconnect();
      });
    });

    const msg = await errorPromise;
    expect(msg).toContain('Authentication required');
  });

  it('should authenticate sockets with JWT and handle full private room match lifecycle', async () => {
    // 1. Connect host socket
    const hostSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => hostSocket.on('connect', () => resolve()));
    expect(hostSocket.connected).toBe(true);

    // 2. Connect guest socket
    const guestSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => guestSocket.on('connect', () => resolve()));
    expect(guestSocket.connected).toBe(true);

    // 3. Host creates private room
    let roomCode = '';
    const roomCreatedPromise = new Promise<GameRoomSummary>((resolve) => {
      hostSocket.on('ROOM_STATE_UPDATE', (summary: GameRoomSummary) => {
        if (summary.status === 'WAITING' && summary.players.length === 1) {
          resolve(summary);
        }
      });
    });

    hostSocket.emit('ROOM_CREATE_PRIVATE', { customTimerSec: 15 });
    const createdSummary = await roomCreatedPromise;

    expect(createdSummary.roomCode).toBeDefined();
    expect(createdSummary.roomCode.length).toBe(6);
    expect(createdSummary.mode).toBe('PRIVATE');
    expect(createdSummary.hostUserId).toBe(testUser1.userId);
    roomCode = createdSummary.roomCode;

    // 4. Guest joins with room code
    const guestJoinedPromise = new Promise<GameRoomSummary>((resolve) => {
      hostSocket.on('ROOM_STATE_UPDATE', (summary: GameRoomSummary) => {
        if (summary.players.length === 2) {
          resolve(summary);
        }
      });
    });

    guestSocket.emit('ROOM_JOIN', { roomCode });
    const twoPlayersSummary = await guestJoinedPromise;

    expect(twoPlayersSummary.players.length).toBe(2);
    expect(twoPlayersSummary.players.some((p) => p.userId === testUser2.userId)).toBe(true);

    // 5. Guest toggles ready
    const guestReadyPromise = new Promise<GameRoomSummary>((resolve) => {
      hostSocket.on('ROOM_STATE_UPDATE', (summary: GameRoomSummary) => {
        const guest = summary.players.find((p) => p.userId === testUser2.userId);
        if (guest && guest.isReady) {
          resolve(summary);
        }
      });
    });

    guestSocket.emit('ROOM_READY_TOGGLE', { isReady: true });
    await guestReadyPromise;

    // 6. Host starts match
    const matchStartPromise = new Promise<GameRoomSummary>((resolve) => {
      hostSocket.on('ROOM_STATE_UPDATE', (summary: GameRoomSummary) => {
        if (summary.status === 'IN_PROGRESS') {
          resolve(summary);
        }
      });
    });

    const turnStartPromise = new Promise<GameTurnState>((resolve) => {
      hostSocket.on('GAME_TURN_START', (turn: GameTurnState) => {
        resolve(turn);
      });
    });

    hostSocket.emit('ROOM_START_MATCH');
    const inProgressSummary = await matchStartPromise;
    const firstTurn = await turnStartPromise;

    expect(inProgressSummary.status).toBe('IN_PROGRESS');
    expect(inProgressSummary.currentWord.length).toBeGreaterThanOrEqual(3);
    expect(firstTurn.activeUserId).toBeDefined();

    // 7. Active player emits typing update during their active turn
    const activeUserId = firstTurn.activeUserId;
    const activeSocket = activeUserId === testUser1.userId ? hostSocket : guestSocket;
    const listeningSocket = activeSocket === hostSocket ? guestSocket : hostSocket;
    const requiredLetter = firstTurn.requiredLetter;

    const typingPromise = new Promise<{ userId: string; inputSuffix: string }>((resolve) => {
      listeningSocket.on('GAME_PLAYER_TYPING', (payload) => {
        resolve(payload);
      });
    });

    activeSocket.emit('GAME_TYPING_UPDATE', { inputSuffix: 'GER' });
    const typingPayload = await typingPromise;
    expect(typingPayload.userId).toBe(activeUserId);
    expect(typingPayload.inputSuffix).toBe('GER');

    // 8. Active player submits a valid chain word suffix
    const candidates = LexiconService.getInstance().getTrie().getWordsWithPrefix(requiredLetter, 10);
    const validWord = candidates.find((w) => !inProgressSummary.historyWords.includes(w))!;
    expect(validWord).toBeDefined();

    const wordAcceptedPromise = new Promise<string>((resolve) => {
      guestSocket.on('GAME_WORD_ACCEPTED', (payload) => {
        resolve(payload.word);
      });
    });

    const suffix = validWord.slice(requiredLetter.length);
    activeSocket.emit('GAME_SUBMIT_WORD', { word: suffix, clientTimestamp: Date.now() });
    const acceptedWord = await wordAcceptedPromise;

    expect(acceptedWord).toBe(validWord);

    // 9. Test clock sync
    const clockSyncPromise = new Promise<number>((resolve) => {
      hostSocket.on('CLOCK_SYNC_PONG', (payload) => {
        resolve(payload.serverTimestamp);
      });
    });

    hostSocket.emit('CLOCK_SYNC_PING', { clientPing: 100 });
    const serverTimestamp = await clockSyncPromise;
    expect(serverTimestamp).toBeGreaterThan(0);

    // 10. Verify guest cannot create another private room while host is active
    const createErrorPromise = new Promise<{ code: string; message: string }>((resolve) => {
      guestSocket.on('SOCKET_ERROR', (err) => {
        resolve(err);
      });
    });

    guestSocket.emit('ROOM_CREATE_PRIVATE', { customTimerSec: 15 });
    const createErr = await createErrorPromise;
    expect(createErr.code).toBe('CANNOT_CREATE_ROOM');

    // Disconnect sockets cleanly
    hostSocket.disconnect();
    guestSocket.disconnect();
  }, 15000);
});
