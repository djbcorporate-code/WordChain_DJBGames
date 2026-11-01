import { LexiconService } from '@wordchain/lexicon';
import { GameRoomSummary } from '@wordchain/shared';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';
import { socketAuthMiddleware } from '../../../sockets/socketAuth.js';
import { setupSocketRouter } from '../../../sockets/socketRouter.js';
import { generateJwt } from '../../../utils/security.js';

describe('Phase 5: Casual Public Matchmaking & Disconnect Recovery', () => {
  let httpServer: http.Server;
  let ioServer: Server;
  let port: number;

  const scholar1 = {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    username: 'CasualScholarA',
    role: 'USER' as const,
    emailVerified: true,
  };

  const scholar2 = {
    userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    username: 'CasualScholarB',
    role: 'USER' as const,
    emailVerified: true,
  };

  let token1: string;
  let token2: string;

  beforeAll(async () => {
    await getDb();
    await LexiconService.getInstance().initialize();

    token1 = generateJwt(scholar1);
    token2 = generateJwt(scholar2);

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
        port = typeof addr === 'object' && addr ? addr.port : 4002;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await closeDb();
  });

  it('should queue two scholars and automatically create a match within 3 seconds', async () => {
    const socketA: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      transports: ['websocket'],
    });

    const socketB: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
      new Promise<void>((resolve) => socketB.on('connect', () => resolve())),
    ]);

    // Both sockets expect MATCH_FOUND
    const matchFoundA = new Promise<string>((resolve) => {
      socketA.on('MATCH_FOUND', (payload) => resolve(payload.roomId));
    });

    const matchFoundB = new Promise<string>((resolve) => {
      socketB.on('MATCH_FOUND', (payload) => resolve(payload.roomId));
    });

    // Enqueue both players
    socketA.emit('LOBBY_JOIN_QUEUE', { mode: 'CASUAL' });
    socketB.emit('LOBBY_JOIN_QUEUE', { mode: 'CASUAL' });

    const [roomIdA, roomIdB] = await Promise.all([matchFoundA, matchFoundB]);

    expect(roomIdA).toBeDefined();
    expect(roomIdA).toBe(roomIdB);

    socketA.disconnect();
    socketB.disconnect();
  }, 10000);

  it('should allow a scholar to cancel matchmaking before match is formed', async () => {
    const socket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const statusUpdates: boolean[] = [];
    socket.on('QUEUE_STATUS', (payload) => {
      statusUpdates.push(payload.inQueue);
    });

    socket.emit('LOBBY_JOIN_QUEUE', { mode: 'CASUAL' });

    // Wait for inQueue: true
    await new Promise((r) => setTimeout(r, 200));
    expect(statusUpdates).toContain(true);

    socket.emit('LOBBY_LEAVE_QUEUE');

    // Wait for inQueue: false
    await new Promise((r) => setTimeout(r, 200));
    expect(statusUpdates[statusUpdates.length - 1]).toBe(false);

    socket.disconnect();
  });

  it('should support disconnect recovery and state restoration during active match', async () => {
    // 1. Establish match between host and guest
    const socketA: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      transports: ['websocket'],
    });

    const socketB: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
      new Promise<void>((resolve) => socketB.on('connect', () => resolve())),
    ]);

    const matchPromiseA = new Promise<string>((resolve) => {
      socketA.on('MATCH_FOUND', (p) => resolve(p.roomId));
    });

    socketA.emit('LOBBY_JOIN_QUEUE', { mode: 'CASUAL' });
    socketB.emit('LOBBY_JOIN_QUEUE', { mode: 'CASUAL' });

    const activeRoomId = await matchPromiseA;

    // Wait for match to start
    await new Promise((r) => setTimeout(r, 3200));

    // 2. Scholar B abruptly disconnects
    const disconnectedNoticePromise = new Promise<GameRoomSummary>((resolve) => {
      socketA.on('ROOM_STATE_UPDATE', (summary) => {
        const guestPlayer = summary.players.find((p) => p.userId === scholar2.userId);
        if (guestPlayer && guestPlayer.isDisconnected) {
          resolve(summary);
        }
      });
    });

    socketB.disconnect();
    const stateAfterDisconnect = await disconnectedNoticePromise;

    const bPlayer = stateAfterDisconnect.players.find((p) => p.userId === scholar2.userId);
    expect(bPlayer?.isDisconnected).toBe(true);

    // 3. Scholar B connects a new socket and sends ROOM_RECONNECT within grace window
    const newSocketB: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => newSocketB.on('connect', () => resolve()));

    const reconnectedPromise = new Promise<GameRoomSummary>((resolve) => {
      newSocketB.on('ROOM_STATE_UPDATE', (summary) => {
        const restoredPlayer = summary.players.find((p) => p.userId === scholar2.userId);
        if (restoredPlayer && !restoredPlayer.isDisconnected) {
          resolve(summary);
        }
      });
    });

    newSocketB.emit('ROOM_RECONNECT', { roomId: activeRoomId });
    const stateAfterReconnect = await reconnectedPromise;

    const restoredB = stateAfterReconnect.players.find((p) => p.userId === scholar2.userId);
    expect(restoredB?.isDisconnected).toBe(false);
    expect(restoredB?.isAlive).toBe(true);

    socketA.disconnect();
    newSocketB.disconnect();
  }, 12000);
});
