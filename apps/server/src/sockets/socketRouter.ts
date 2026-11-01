import {
  ClientToServerEvents,
  GameRoomSummary,
  PlayerInGame,
  ServerToClientEvents,
} from '@wordchain/shared';
import { Server, Socket } from 'socket.io';
import { GameRoom, GameRoomCallbacks } from '../game/GameRoom.js';
import { RoomManager } from '../game/RoomManager.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { AuthenticatedSocket } from './socketAuth.js';

export function setupSocketRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    console.log(`[Socket] Scholar connected: ${user.username} (${user.userId}) [socketId: ${socket.id}]`);

    // Helper: Bind Room Callbacks to broadcast via Socket.IO
    function bindRoomCallbacks(room: GameRoom) {
      const callbacks: GameRoomCallbacks = {
        onStateChange: (summary: GameRoomSummary) => {
          io.to(room.roomId).emit('ROOM_STATE_UPDATE', summary);
        },
        onTurnStart: (turnState) => {
          io.to(room.roomId).emit('GAME_TURN_START', turnState);
        },
        onWordAccepted: (payload) => {
          io.to(room.roomId).emit('GAME_WORD_ACCEPTED', payload);
        },
        onWordRejected: (payload) => {
          // Send rejection only to the user who submitted
          socket.emit('GAME_WORD_REJECTED', {
            word: payload.word,
            reason: payload.reason,
            message: getRejectionMessage(payload.reason, payload.word),
          });
        },
        onLetterExhausted: (payload) => {
          io.to(room.roomId).emit('GAME_LETTER_EXHAUSTED', payload);
        },
        onPlayerEliminated: (payload) => {
          io.to(room.roomId).emit('GAME_PLAYER_ELIMINATED', payload);
        },
        onMatchEnded: (payload) => {
          io.to(room.roomId).emit('GAME_MATCH_ENDED', {
            winnerId: payload.winnerId,
            standings: payload.standings,
            deltas: {}, // Will be populated in Phase 6 competitive settlement
          });
        },
      };

      (room as any).callbacks = callbacks;
    }

    // CREATE PRIVATE ROOM
    socket.on('ROOM_CREATE_PRIVATE', async (payload) => {
      try {
        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3 },
          profile: { avatarId: 'avatar_default_01' },
        }));

        const room = roomManager.createRoom({
          mode: 'PRIVATE',
          hostUserId: user.userId,
          startTimerSec: payload?.customTimerSec || 15,
        });

        bindRoomCallbacks(room);

        const hostPlayer: PlayerInGame = {
          userId: user.userId,
          username: user.username,
          avatarId: fullUser.profile.avatarId,
          tier: fullUser.currentRank.tier,
          division: fullUser.currentRank.division,
          isAlive: true,
          isReady: true,
          wordsSubmitted: 0,
          isDisconnected: false,
        };

        room.addPlayer(hostPlayer);
        socket.join(room.roomId);
        socket.data.roomId = room.roomId;

        io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        console.log(`[Socket] Room created: ${room.roomCode} (${room.roomId}) by ${user.username}`);
      } catch (err: any) {
        socket.emit('SOCKET_ERROR', { code: 'ROOM_CREATE_FAILED', message: err.message });
      }
    });

    // JOIN ROOM BY CODE
    socket.on('ROOM_JOIN', async ({ roomCode }) => {
      try {
        const room = roomManager.getRoomByCode(roomCode);
        if (!room) {
          socket.emit('SOCKET_ERROR', { code: 'ROOM_NOT_FOUND', message: `No active room found with code '${roomCode}'` });
          return;
        }

        if (room.status !== 'WAITING') {
          socket.emit('SOCKET_ERROR', { code: 'ROOM_IN_PROGRESS', message: 'This match has already started.' });
          return;
        }

        if (room.players.size >= 8) {
          socket.emit('SOCKET_ERROR', { code: 'ROOM_FULL', message: 'Room has reached maximum capacity (8 players).' });
          return;
        }

        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3 },
          profile: { avatarId: 'avatar_default_01' },
        }));

        const joiningPlayer: PlayerInGame = {
          userId: user.userId,
          username: user.username,
          avatarId: fullUser.profile.avatarId,
          tier: fullUser.currentRank.tier,
          division: fullUser.currentRank.division,
          isAlive: true,
          isReady: false,
          wordsSubmitted: 0,
          isDisconnected: false,
        };

        const added = room.addPlayer(joiningPlayer);
        if (!added) {
          socket.emit('SOCKET_ERROR', { code: 'JOIN_FAILED', message: 'Could not join room.' });
          return;
        }

        bindRoomCallbacks(room);

        socket.join(room.roomId);
        socket.data.roomId = room.roomId;

        io.to(room.roomId).emit('ROOM_PLAYER_JOINED', { player: joiningPlayer });
        io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        console.log(`[Socket] ${user.username} joined room ${room.roomCode}`);
      } catch (err: any) {
        socket.emit('SOCKET_ERROR', { code: 'ROOM_JOIN_ERROR', message: err.message });
      }
    });

    // TOGGLE READY STATUS
    socket.on('ROOM_READY_TOGGLE', ({ isReady }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      room.setPlayerReady(user.userId, isReady);
      io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
    });

    // START MATCH (Host Only)
    socket.on('ROOM_START_MATCH', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (room.hostUserId !== user.userId) {
        socket.emit('SOCKET_ERROR', { code: 'FORBIDDEN', message: 'Only the host can start the match.' });
        return;
      }

      if (room.players.size < 2) {
        socket.emit('SOCKET_ERROR', { code: 'NOT_ENOUGH_PLAYERS', message: 'At least 2 players are required to start.' });
        return;
      }

      const allReady = Array.from(room.players.values()).every((p) => p.isReady);
      if (!allReady) {
        socket.emit('SOCKET_ERROR', { code: 'PLAYERS_NOT_READY', message: 'All scholars must be marked Ready before starting.' });
        return;
      }

      room.startMatch();
    });

    // SUBMIT WORD
    socket.on('GAME_SUBMIT_WORD', ({ word, clientTimestamp }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      room.submitWord(user.userId, word, clientTimestamp);
    });

    // SYNC STATE
    socket.on('GAME_REQUEST_SYNC', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        socket.emit('ROOM_STATE_UPDATE', room.getSummary());
      }
    });

    // CLOCK SYNC PING
    socket.on('CLOCK_SYNC_PING', ({ clientPing }) => {
      socket.emit('CLOCK_SYNC_PONG', {
        clientPing,
        serverTimestamp: Date.now(),
      });
    });

    // LEAVE ROOM
    socket.on('ROOM_LEAVE', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        const { wasHost, newHostId, shouldClose } = room.removePlayer(user.userId);
        socket.leave(room.roomId);
        delete socket.data.roomId;

        if (shouldClose) {
          roomManager.removeRoom(roomId);
        } else {
          io.to(roomId).emit('ROOM_PLAYER_LEFT', { userId: user.userId, newHostUserId: newHostId });
          io.to(roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        }
      }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (room.status === 'WAITING') {
        const { newHostId, shouldClose } = room.removePlayer(user.userId);
        if (shouldClose) {
          roomManager.removeRoom(roomId);
        } else {
          io.to(roomId).emit('ROOM_PLAYER_LEFT', { userId: user.userId, newHostUserId: newHostId });
          io.to(roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        }
      } else if (room.status === 'IN_PROGRESS') {
        const player = room.players.get(user.userId);
        if (player && player.isAlive) {
          player.isDisconnected = true;
          player.disconnectedAt = Date.now();
          io.to(roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        }
      }
    });
  });
}

function getRejectionMessage(reason: string, word: string): string {
  switch (reason) {
    case 'NOT_IN_DICTIONARY':
      return `'${word}' is not in the approved English dictionary.`;
    case 'ALREADY_USED':
      return `'${word}' has already been chained in this match!`;
    case 'INVALID_PREFIX':
      return `Word must begin with the final letter of the previous word.`;
    case 'TOO_SHORT':
      return `Word must be at least 3 letters long.`;
    case 'TOO_LONG':
      return `Word cannot exceed 25 letters.`;
    case 'NOT_YOUR_TURN':
      return `Wait for your turn!`;
    case 'RATE_LIMITED':
      return `Too many rapid attempts. Please slow down!`;
    default:
      return `Word rejected (${reason})`;
  }
}
