import { LexiconService } from '@wordchain/lexicon';
import { GameRoomSummary } from '@wordchain/shared';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';
import { playerProfiles, users } from '../../../db/schema.js';
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
        const guestPlayer = summary.players.find((p: any) => p.userId === scholar2.userId);
        if (guestPlayer && guestPlayer.isDisconnected) {
          resolve(summary);
        }
      });
    });

    socketB.disconnect();
    const stateAfterDisconnect = await disconnectedNoticePromise;

    const bPlayer = stateAfterDisconnect.players.find((p: any) => p.userId === scholar2.userId);
    expect(bPlayer?.isDisconnected).toBe(true);

    // 3. Scholar B connects a new socket and sends ROOM_RECONNECT within grace window
    const newSocketB: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => newSocketB.on('connect', () => resolve()));

    const reconnectedPromise = new Promise<GameRoomSummary>((resolve) => {
      newSocketB.on('ROOM_STATE_UPDATE', (summary) => {
        const restoredPlayer = summary.players.find((p: any) => p.userId === scholar2.userId);
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

  it('should reject a scholar without prerequisites from joining Ranked queue', async () => {
    const db = await getDb();
    const lockedUserId = '99999999-9999-9999-9999-999999999999';
    await db
      .insert(users)
      .values({
        id: lockedUserId,
        email: 'locked@wordchain.io',
        username: 'LockedScholar',
        passwordHash: 'hash',
        emailVerified: false,
      })
      .onConflictDoNothing();

    const lockedToken = generateJwt({
      userId: lockedUserId,
      username: 'LockedScholar',
      role: 'USER',
      emailVerified: false,
    });

    const lockedSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: lockedToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => lockedSocket.on('connect', () => resolve()));

    const errorPromise = new Promise<{ code: string; message: string }>((resolve) => {
      lockedSocket.on('SOCKET_ERROR', (err) => resolve(err));
    });

    lockedSocket.emit('LOBBY_JOIN_QUEUE', { mode: 'RANKED' });
    const err = await errorPromise;

    expect(err.code).toBe('RANKED_NOT_ELIGIBLE');
    expect(err.message).toContain('Complete at least 5 casual matches');

    lockedSocket.disconnect();
  });

  it('should assemble exactly 4 eligible scholars into a 4-Player FFA Ranked match', async () => {
    const db = await getDb();
    const rankedUsers = [
      { id: '12121212-1212-1212-1212-121212121212', username: 'RankedP1' },
      { id: '23232323-2323-2323-2323-232323232323', username: 'RankedP2' },
      { id: '34343434-3434-3434-3434-343434343434', username: 'RankedP3' },
      { id: '45454545-4545-4545-4545-454545454545', username: 'RankedP4' },
    ];

    const sockets: ClientSocket[] = [];

    for (const u of rankedUsers) {
      await db
        .insert(users)
        .values({
          id: u.id,
          email: `${u.username.toLowerCase()}@wordchain.io`,
          username: u.username,
          passwordHash: 'hash',
          emailVerified: true,
        })
        .onConflictDoNothing();

      await db
        .insert(playerProfiles)
        .values({
          userId: u.id,
          totalMatches: 8,
          totalWins: 3,
        })
        .onConflictDoNothing();

      const token = generateJwt({
        userId: u.id,
        username: u.username,
        role: 'USER',
        emailVerified: true,
      });

      const s = Client(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
      });
      await new Promise<void>((r) => s.on('connect', () => r()));
      sockets.push(s);
    }

    const matchFoundPromises = sockets.map((s) => {
      return new Promise<{ roomId: string; mode: string }>((resolve) => {
        s.on('MATCH_FOUND', (payload) => resolve(payload));
      });
    });

    // Enqueue all 4 into Ranked queue
    for (const s of sockets) {
      s.emit('LOBBY_JOIN_QUEUE', { mode: 'RANKED' });
    }

    const matchResults = await Promise.all(matchFoundPromises);

    // All 4 receive identical roomId and mode = RANKED
    expect(matchResults[0].mode).toBe('RANKED');
    expect(matchResults[0].roomId).toBe(matchResults[1].roomId);
    expect(matchResults[0].roomId).toBe(matchResults[2].roomId);
    expect(matchResults[0].roomId).toBe(matchResults[3].roomId);

    for (const s of sockets) {
      s.disconnect();
    }
  }, 10000);
});
