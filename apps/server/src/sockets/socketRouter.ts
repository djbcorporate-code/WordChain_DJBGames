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
import { MatchmakingService } from '../modules/matchmaking/MatchmakingService.js';
import { RankingService } from '../modules/ranking/RankingService.js';
import { AuthenticatedSocket } from './socketAuth.js';
import { setIoServer } from './socketRegistry.js';

export function setupSocketRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  setIoServer(io as any);
  const roomManager = RoomManager.getInstance();
  const matchmakingService = MatchmakingService.getInstance();
  const disconnectTimers = new Map<string, NodeJS.Timeout>();

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
        io.to(room.roomId).emit('GAME_WORD_REJECTED', {
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
      onLifeLost: (payload) => {
        io.to(room.roomId).emit('GAME_LIFE_LOST', payload);
      },
      onMatchEnded: async (payload) => {
        try {
          const deltas = await RankingService.settleMatchResults(room.roomId, room);
          io.to(room.roomId).emit('GAME_MATCH_ENDED', {
            winnerId: payload.winnerId,
            standings: payload.standings,
            deltas,
          });
        } catch (err: any) {
          console.error(`[Socket] Error settling match ${room.roomId}:`, err);
          io.to(room.roomId).emit('GAME_MATCH_ENDED', {
            winnerId: payload.winnerId,
            standings: payload.standings,
            deltas: {},
          });
        }
      },
    };

    (room as any).callbacks = callbacks;
  }

  // Initialize Matchmaking with Socket broadcaster
  matchmakingService.initialize(io, bindRoomCallbacks);

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    console.log(`[Socket] Scholar connected: ${user.username} (${user.userId}) [socketId: ${socket.id}]`);

    // AUTO-RECONNECT CHECK: If user was disconnected from an active match, clear timeout and re-attach!
    const activeRooms = Array.from((roomManager as any).rooms.values()) as GameRoom[];
    for (const room of activeRooms) {
      if (room.status === 'IN_PROGRESS') {
        const player = room.players.get(user.userId);
        if (player && player.isAlive && player.isDisconnected) {
          const pendingTimer = disconnectTimers.get(user.userId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectTimers.delete(user.userId);
          }

          player.isDisconnected = false;
          player.disconnectedAt = undefined;
          socket.join(room.roomId);
          socket.data.roomId = room.roomId;

          socket.emit('ROOM_STATE_UPDATE', room.getSummary());
          if (room.getSummary().turnState) {
            socket.emit('GAME_TURN_START', room.getSummary().turnState!);
          }
          io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
          console.log(`[Socket] Auto-reconnected disconnected scholar: ${user.username} to room ${room.roomCode}`);
          break;
        }
      }
    }

    // MATCHMAKING: JOIN QUEUE (Casual / Ranked)
    socket.on('LOBBY_JOIN_QUEUE', async ({ mode, language }) => {
      try {
        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3, hiddenMmr: 1000 },
          profile: { avatarId: 'avatar_default_01' },
        }));

        const playerInfo: PlayerInGame = {
          userId: user.userId,
          username: user.username,
          avatarId: fullUser.profile.avatarId,
          tier: fullUser.currentRank.tier,
          division: fullUser.currentRank.division,
          lives: 3,
          isAlive: true,
          isReady: true,
          wordsSubmitted: 0,
          isDisconnected: false,
        };

        await matchmakingService.enqueue(
          user,
          socket,
          playerInfo,
          mode || 'CASUAL',
          (fullUser.currentRank as any).hiddenMmr || 1000,
          language || 'ENGLISH'
        );
      } catch (err: any) {
        socket.emit('SOCKET_ERROR', { code: 'QUEUE_FAILED', message: err.message });
      }
    });

    // MATCHMAKING: LEAVE QUEUE
    socket.on('LOBBY_LEAVE_QUEUE', () => {
      matchmakingService.dequeue(user.userId);
    });

    // CREATE PRIVATE ROOM
    socket.on('ROOM_CREATE_PRIVATE', async (payload) => {
      try {
        // Guard: Prevent users from making another room unless the creator leaves the room
        const currentRoomId = socket.data.roomId;
        if (currentRoomId) {
          const currentRoom = roomManager.getRoom(currentRoomId);
          if (currentRoom && currentRoom.mode === 'PRIVATE') {
            if (currentRoom.hostUserId !== user.userId && currentRoom.players.has(currentRoom.hostUserId)) {
              socket.emit('SOCKET_ERROR', {
                code: 'CANNOT_CREATE_ROOM',
                message: 'You cannot create another room while the room creator is active in your current room.',
              });
              return;
            }
          }
        }

        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3 },
          profile: { avatarId: 'avatar_default_01' },
        }));

        const room = roomManager.createRoom({
          mode: 'PRIVATE',
          language: payload?.language || 'ENGLISH',
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
          lives: 3,
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
      if (!roomCode || typeof roomCode !== 'string') {
        socket.emit('SOCKET_ERROR', { code: 'INVALID_ROOM_CODE', message: 'Room code must be a valid code.' });
        return;
      }
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
          lives: 3,
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

    // ADD GUEST SCHOLAR (Host Only, Private Rooms)
    socket.on('ROOM_ADD_GUEST', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room || room.status !== 'WAITING') return;

      if (room.hostUserId !== user.userId) {
        socket.emit('SOCKET_ERROR', { code: 'FORBIDDEN', message: 'Only the host can add guest players.' });
        return;
      }

      if (room.players.size >= 8) {
        socket.emit('SOCKET_ERROR', { code: 'ROOM_FULL', message: 'Room has reached maximum capacity of 8 players.' });
        return;
      }

      const guestNames = ['Guest_Hypatia', 'Guest_Aristotle', 'Guest_Curie', 'Guest_Newton', 'Guest_Tesla', 'Guest_Ada', 'Guest_Pascal'];
      const guestIndex = room.players.size;
      const guestUsername = `${guestNames[guestIndex % guestNames.length]}_${Math.floor(100 + Math.random() * 900)}`;

      const guestPlayer: PlayerInGame = {
        userId: `guest-bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        username: guestUsername,
        avatarId: `avatar_0${(guestIndex % 4) + 1}`,
        tier: 'NURSERY',
        division: 3,
        lives: 3,
        isAlive: true,
        isReady: true,
        wordsSubmitted: 0,
        isDisconnected: false,
      };

      room.addPlayer(guestPlayer);
      io.to(room.roomId).emit('ROOM_PLAYER_JOINED', { player: guestPlayer });
      io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
      console.log(`[Socket] Host ${user.username} added guest player ${guestUsername} to room ${room.roomCode}`);
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
      if (!word || typeof word !== 'string' || !word.trim()) {
        return;
      }
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      room.submitWord(user.userId, word, clientTimestamp);
    });

    // REAL-TIME TYPING BROADCAST (Roblox style peer typing sync)
    socket.on('GAME_TYPING_UPDATE', ({ inputSuffix }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room || room.status !== 'IN_PROGRESS') return;

      const activeUserId = room.getActivePlayerId();
      if (activeUserId === user.userId) {
        socket.to(room.roomId).emit('GAME_PLAYER_TYPING', {
          userId: user.userId,
          inputSuffix: typeof inputSuffix === 'string' ? inputSuffix.slice(0, 46) : '',
        });
      }
    });

    // PRIVATE ROOM REMATCH (Reset room to lobby without changing room code)
    socket.on('ROOM_RESET_REMATCH', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room || room.mode !== 'PRIVATE') return;

      if (room.hostUserId !== user.userId) {
        socket.emit('SOCKET_ERROR', { code: 'FORBIDDEN', message: 'Only the room creator can initiate a rematch.' });
        return;
      }

      const reset = room.resetToLobby();
      if (reset) {
        io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
      }
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

    // MANUAL RECONNECT REQUEST
    socket.on('ROOM_RECONNECT', ({ roomId }) => {
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('SOCKET_ERROR', { code: 'RECONNECT_FAILED', message: 'Invalid room identifier.' });
        return;
      }
      const room = roomManager.getRoom(roomId);
      if (!room || room.status !== 'IN_PROGRESS') {
        socket.emit('SOCKET_ERROR', { code: 'RECONNECT_FAILED', message: 'No active match to restore.' });
        return;
      }

      const player = room.players.get(user.userId);
      if (!player || !player.isAlive) {
        socket.emit('SOCKET_ERROR', { code: 'RECONNECT_FAILED', message: 'Player eliminated or not in match.' });
        return;
      }

      const pendingTimer = disconnectTimers.get(user.userId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectTimers.delete(user.userId);
      }

      player.isDisconnected = false;
      player.disconnectedAt = undefined;

      socket.join(room.roomId);
      socket.data.roomId = room.roomId;

      socket.emit('ROOM_STATE_UPDATE', room.getSummary());
      if (room.getSummary().turnState) {
        socket.emit('GAME_TURN_START', room.getSummary().turnState!);
      }
      io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
      console.log(`[Socket] Scholar manually reconnected: ${user.username} to room ${room.roomCode}`);
    });

    // LEAVE ROOM
    socket.on('ROOM_LEAVE', () => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        socket.emit('ROOM_STATE_UPDATE', null);
        return;
      }

      // Notify voice peers before leaving
      socket.to(roomId).emit('VOICE_PEER_LEFT', { userId: user.userId });

      // Leave socket channel immediately so no subsequent room state broadcasts reach this leaving socket
      socket.leave(roomId);
      delete socket.data.roomId;

      // Definitively clear the room state on this client
      socket.emit('ROOM_STATE_UPDATE', null);

      const room = roomManager.getRoom(roomId);
      if (room) {
        const { newHostId, shouldClose } = room.removePlayer(user.userId);

        if (shouldClose) {
          roomManager.removeRoom(roomId);
        } else {
          io.to(roomId).emit('ROOM_PLAYER_LEFT', { userId: user.userId, newHostUserId: newHostId });
          io.to(roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
        }
      }
    });

    // WEBRTC OPEN MIC VOICE CHAT (Private Rooms)
    socket.on('VOICE_JOIN_ROOM', () => {
      let roomId = socket.data.roomId;
      if (!roomId) {
        for (const r of socket.rooms) {
          if (r !== socket.id) {
            roomId = r;
            socket.data.roomId = r;
            break;
          }
        }
      }
      if (!roomId) return;
      socket.to(roomId).emit('VOICE_PEER_JOINED', { userId: user.userId });
    });

    socket.on('VOICE_SIGNAL', ({ targetUserId, signal }) => {
      let roomId = socket.data.roomId;
      if (!roomId) {
        for (const r of socket.rooms) {
          if (r !== socket.id) {
            roomId = r;
            socket.data.roomId = r;
            break;
          }
        }
      }

      let delivered = false;

      // 1. Look in room sockets first
      if (roomId) {
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const peerSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
            const peerUserId = peerSocket?.data?.user?.userId || (peerSocket?.data?.user as any)?.id;
            if (peerSocket && peerUserId === targetUserId) {
              peerSocket.emit('VOICE_SIGNAL', {
                senderUserId: user.userId,
                signal,
              });
              delivered = true;
              break;
            }
          }
        }
      }

      // 2. Global fallback across connected sockets
      if (!delivered) {
        for (const [, peerSocket] of io.sockets.sockets) {
          const authSocket = peerSocket as AuthenticatedSocket;
          const peerUserId = authSocket?.data?.user?.userId || (authSocket?.data?.user as any)?.id;
          if (peerUserId === targetUserId) {
            authSocket.emit('VOICE_SIGNAL', {
              senderUserId: user.userId,
              signal,
            });
            break;
          }
        }
      }
    });

    socket.on('VOICE_STATE_UPDATE', ({ isMuted, isSpeaking }) => {
      let roomId = socket.data.roomId;
      if (!roomId) {
        for (const r of socket.rooms) {
          if (r !== socket.id) {
            roomId = r;
            socket.data.roomId = r;
            break;
          }
        }
      }
      if (!roomId) return;
      socket.to(roomId).emit('VOICE_STATE_UPDATE', {
        userId: user.userId,
        isMuted,
        isSpeaking,
      });
    });

    socket.on('VOICE_LEAVE_ROOM', () => {
      let roomId = socket.data.roomId;
      if (!roomId) {
        for (const r of socket.rooms) {
          if (r !== socket.id) {
            roomId = r;
            socket.data.roomId = r;
            break;
          }
        }
      }
      if (!roomId) return;
      socket.to(roomId).emit('VOICE_PEER_LEFT', { userId: user.userId });
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      // Dequeue if waiting in matchmaking queue
      matchmakingService.dequeue(user.userId);

      const roomId = socket.data.roomId;
      if (!roomId) return;

      // Notify voice peers of departure
      socket.to(roomId).emit('VOICE_PEER_LEFT', { userId: user.userId });
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

          // 25-second grace window before auto-forfeit elimination
          const timer = setTimeout(() => {
            disconnectTimers.delete(user.userId);
            const targetRoom = roomManager.getRoom(roomId);
            if (targetRoom && targetRoom.status === 'IN_PROGRESS') {
              const p = targetRoom.players.get(user.userId);
              if (p && p.isDisconnected && p.isAlive) {
                targetRoom.eliminatePlayer(user.userId, 'DISCONNECT');
              }
            }
          }, 25000);

          disconnectTimers.set(user.userId, timer);
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
      return `Word cannot exceed 46 letters.`;
    case 'NOT_YOUR_TURN':
      return `Wait for your turn!`;
    case 'RATE_LIMITED':
      return `Too many rapid attempts. Please slow down!`;
    default:
      return `Word rejected (${reason})`;
  }
}
