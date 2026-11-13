import {
  ClientToServerEvents,
  GameLanguage,
  GameRoomSummary,
  GameType,
  MathRoomSummary,
  PlayerInGame,
  RoomChatMessage,
  ServerToClientEvents,
} from '@wordchain/shared';
import { Server, Socket } from 'socket.io';
import { GameRoom, GameRoomCallbacks } from '../game/GameRoom.js';
import { MathGameRoom, MathGameRoomCallbacks } from '../game/math/MathGameRoom.js';
import { AnyGameRoom, RoomManager } from '../game/RoomManager.js';
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

  function emitRoomStateToRoom(room: AnyGameRoom): void {
    if (room.gameType === 'MATHRACE') {
      io.to(room.roomId).emit('MATH_ROOM_STATE_UPDATE', room.getSummary());
    } else {
      io.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
    }
  }

  function emitRoomStateToSocket(socket: AuthenticatedSocket, room: AnyGameRoom): void {
    if (room.gameType === 'MATHRACE') {
      socket.emit('MATH_ROOM_STATE_UPDATE', room.getSummary());
    } else {
      socket.emit('ROOM_STATE_UPDATE', room.getSummary());
    }
  }

  function emitClearRoomState(socket: AuthenticatedSocket): void {
    socket.emit('ROOM_STATE_UPDATE', null);
    socket.emit('MATH_ROOM_STATE_UPDATE', null);
  }

  function findSocketInRoom(roomId: string, targetUserId: string): AuthenticatedSocket | undefined {
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return undefined;
    for (const socketId of roomSockets) {
      const candidate = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
      if (candidate?.data?.user?.userId === targetUserId) {
        return candidate;
      }
    }
    return undefined;
  }

  function bindWordRoomCallbacks(room: GameRoom): void {
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
          message: getRejectionMessage(payload.reason, payload.word, room.language),
        });
      },
      onLetterExhausted: (payload) => {
        io.to(room.roomId).emit('GAME_LETTER_EXHAUSTED', payload);
      },
      onSkillActivated: (payload) => {
        io.to(room.roomId).emit('GAME_SKILL_ACTIVATED', payload);
      },
      onSkillRejected: (payload) => {
        io.to(room.roomId).emit('GAME_SKILL_REJECTED', {
          skillId: payload.skillId,
          reason: payload.reason,
          userId: payload.userId,
        });
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

  function bindMathRoomCallbacks(room: MathGameRoom): void {
    const callbacks: MathGameRoomCallbacks = {
      onStateChange: (summary: MathRoomSummary) => {
        io.to(room.roomId).emit('MATH_ROOM_STATE_UPDATE', summary);
      },
      onRoundPickStart: (payload) => {
        io.to(room.roomId).emit('MATH_ROUND_PICK_START', payload);
      },
      onPlayerPicked: (payload) => {
        io.to(room.roomId).emit('MATH_PLAYER_PICKED', payload);
      },
      onRoundRaceStart: (payload) => {
        io.to(room.roomId).emit('MATH_ROUND_RACE_START', payload);
      },
      onPlayerSolved: (payload) => {
        io.to(room.roomId).emit('MATH_PLAYER_SOLVED', payload);
      },
      onAnswerRejected: (payload) => {
        const targetSocket = findSocketInRoom(room.roomId, payload.userId);
        targetSocket?.emit('MATH_ANSWER_REJECTED', {
          reason: payload.reason,
          message: payload.message,
          lockedOut: payload.lockedOut,
        });
      },
      onRoundEnded: (payload) => {
        io.to(room.roomId).emit('MATH_ROUND_ENDED', payload);
      },
      onMatchEnded: async (payload) => {
        try {
          const deltas = await RankingService.settleMatchSummary(room.roomId, {
            roomCode: room.roomCode,
            gameType: 'MATHRACE',
            mode: room.mode,
            roundNumber: room.roundNumber,
            createdAt: room.createdAt,
            participants: payload.standings.map((p, idx) => ({
              userId: p.userId,
              tier: p.tier,
              division: p.division,
              placement: p.placement || idx + 1,
              activityCount: p.score,
              eliminatedReason: p.placement === 1 ? 'WINNER' : 'COMPLETED',
            })),
          });
          io.to(room.roomId).emit('MATH_MATCH_ENDED', {
            winnerId: payload.winnerId,
            standings: payload.standings,
            deltas,
          });
        } catch (err: any) {
          console.error(`[Socket] Error settling MathBlitz match ${room.roomId}:`, err);
          io.to(room.roomId).emit('MATH_MATCH_ENDED', {
            winnerId: payload.winnerId,
            standings: payload.standings,
            deltas: {},
          });
        }
      },
    };

    (room as any).callbacks = callbacks;
  }

  function bindRoomCallbacks(room: AnyGameRoom): void {
    if (room.gameType === 'MATHRACE') {
      bindMathRoomCallbacks(room);
    } else {
      bindWordRoomCallbacks(room);
    }
  }

  // Initialize Matchmaking with Socket broadcaster
  matchmakingService.initialize(io, bindRoomCallbacks);

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    console.log(`[Socket] Scholar connected: ${user.username} (${user.userId}) [socketId: ${socket.id}]`);

    // AUTO-RECONNECT CHECK: If user was disconnected from an active match, clear timeout and re-attach!
    const activeRooms = roomManager.getAllRooms();
    for (const room of activeRooms) {
      if (room.status === 'IN_PROGRESS') {
        const player = room.players.get(user.userId);
        const canReconnect =
          room.gameType === 'MATHRACE'
            ? Boolean(player && player.isDisconnected)
            : Boolean(player && (player as PlayerInGame).isAlive && player.isDisconnected);

        if (player && canReconnect) {
          const pendingTimer = disconnectTimers.get(user.userId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectTimers.delete(user.userId);
          }

          player.isDisconnected = false;
          player.disconnectedAt = undefined;
          socket.join(room.roomId);
          socket.data.roomId = room.roomId;

          emitRoomStateToSocket(socket, room);
          if (room.gameType === 'WORDCHAIN') {
            const wordTurn = room.getSummary().turnState;
            if (wordTurn) {
              socket.emit('GAME_TURN_START', wordTurn);
            }
          }
          emitRoomStateToRoom(room);
          console.log(`[Socket] Auto-reconnected disconnected scholar: ${user.username} to room ${room.roomCode}`);
          break;
        }
      }
    }

    // MATCHMAKING: JOIN QUEUE (Casual / Ranked)
    socket.on('LOBBY_JOIN_QUEUE', async (payload) => {
      try {
        const gameType: GameType = payload?.gameType === 'MATHRACE' ? 'MATHRACE' : 'WORDCHAIN';
        const mode = payload?.mode || 'CASUAL';
        const language = payload?.language || 'ENGLISH';
        const operationMode = payload?.operationMode || 'MIXED';

        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3, hiddenMmr: 1000 },
          gameRanks: undefined,
          profile: { avatarId: 'avatar_default_01' },
        }));

        const gameRank = fullUser.gameRanks?.[gameType] || fullUser.currentRank;

        const playerInfo: PlayerInGame = {
          userId: user.userId,
          username: user.username,
          avatarId: fullUser.profile.avatarId,
          tier: gameRank.tier,
          division: gameRank.division,
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
          mode,
          (gameRank as any).hiddenMmr || 1000,
          language,
          gameType,
          operationMode
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

        const gameType: GameType = payload?.gameType === 'MATHRACE' ? 'MATHRACE' : 'WORDCHAIN';

        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3 },
          gameRanks: undefined,
          profile: { avatarId: 'avatar_default_01' },
        }));

        const gameRank = fullUser.gameRanks?.[gameType] || fullUser.currentRank;

        if (gameType === 'MATHRACE') {
          const mathRoom = roomManager.createMathRoom({
            mode: 'PRIVATE',
            operationMode: payload?.operationMode || 'MIXED',
            hostUserId: user.userId,
            maxPlayers: 6,
            raceDurationSec: payload?.customTimerSec || 15,
          });

          bindRoomCallbacks(mathRoom);
          mathRoom.addPlayer({
            userId: user.userId,
            username: user.username,
            avatarId: fullUser.profile.avatarId,
            tier: gameRank.tier,
            division: gameRank.division,
            isReady: true,
          });

          socket.join(mathRoom.roomId);
          socket.data.roomId = mathRoom.roomId;
          emitRoomStateToRoom(mathRoom);
          console.log(`[Socket] MathBlitz private room created: ${mathRoom.roomCode} (${mathRoom.roomId}) by ${user.username}`);
          return;
        }

        const room = roomManager.createRoom({
          mode: 'PRIVATE',
          language: payload?.language || 'MIXED',
          hostUserId: user.userId,
          startTimerSec: payload?.customTimerSec || 15,
        });

        bindRoomCallbacks(room);

        const hostPlayer: PlayerInGame = {
          userId: user.userId,
          username: user.username,
          avatarId: fullUser.profile.avatarId,
          tier: gameRank.tier,
          division: gameRank.division,
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

        const maxCap = room.maxPlayers || 8;
        if (room.players.size >= maxCap) {
          socket.emit('SOCKET_ERROR', { code: 'ROOM_FULL', message: `Room has reached maximum capacity (${maxCap} players).` });
          return;
        }

        const fullUser = await AuthService.getFullUserProfile(user.userId).catch(() => ({
          id: user.userId,
          username: user.username,
          currentRank: { tier: 'NURSERY' as const, division: 3 },
          gameRanks: undefined,
          profile: { avatarId: 'avatar_default_01' },
        }));

        const gameRank = fullUser.gameRanks?.[room.gameType] || fullUser.currentRank;

        let added = false;
        if (room.gameType === 'MATHRACE') {
          added = room.addPlayer({
            userId: user.userId,
            username: user.username,
            avatarId: fullUser.profile.avatarId,
            tier: gameRank.tier,
            division: gameRank.division,
            isReady: false,
          });
        } else {
          const joiningPlayer: PlayerInGame = {
            userId: user.userId,
            username: user.username,
            avatarId: fullUser.profile.avatarId,
            tier: gameRank.tier,
            division: gameRank.division,
            lives: 3,
            isAlive: true,
            isReady: false,
            wordsSubmitted: 0,
            isDisconnected: false,
          };
          added = room.addPlayer(joiningPlayer);
          if (added) {
            io.to(room.roomId).emit('ROOM_PLAYER_JOINED', { player: joiningPlayer });
          }
        }

        if (!added) {
          socket.emit('SOCKET_ERROR', { code: 'JOIN_FAILED', message: 'Could not join room.' });
          return;
        }

        bindRoomCallbacks(room);

        socket.join(room.roomId);
        socket.data.roomId = room.roomId;

        // System chat notification for joined player
        const joinMsg: RoomChatMessage = {
          id: `sys-join-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          roomId: room.roomId,
          userId: 'system',
          username: 'System',
          text: `${user.username} joined the lobby.`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.addChatMessage(joinMsg);
        io.to(room.roomId).emit('ROOM_CHAT_MESSAGE', joinMsg);
        emitRoomStateToRoom(room);
        console.log(`[Socket] ${user.username} joined ${room.gameType} room ${room.roomCode}`);
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

      // System chat notification for ready status
      const readyMsg: RoomChatMessage = {
        id: `sys-ready-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.roomId,
        userId: 'system',
        username: 'System',
        text: `${user.username} is ${isReady ? 'Ready' : 'not ready'}.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      room.addChatMessage(readyMsg);
      io.to(room.roomId).emit('ROOM_CHAT_MESSAGE', readyMsg);
      emitRoomStateToRoom(room);
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

      const maxCap = room.maxPlayers || 8;
      if (room.players.size >= maxCap) {
        socket.emit('SOCKET_ERROR', { code: 'ROOM_FULL', message: `Room has reached maximum capacity of ${maxCap} players.` });
        return;
      }

      const guestNames = ['Guest_Hypatia', 'Guest_Aristotle', 'Guest_Curie', 'Guest_Newton', 'Guest_Tesla', 'Guest_Ada', 'Guest_Pascal'];
      const guestIndex = room.players.size;
      const guestUsername = `${guestNames[guestIndex % guestNames.length]}_${Math.floor(100 + Math.random() * 900)}`;

      if (room.gameType === 'MATHRACE') {
        room.addPlayer({
          userId: `guest-bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          username: guestUsername,
          avatarId: `avatar_0${(guestIndex % 4) + 1}`,
          tier: 'NURSERY',
          division: 3,
          isReady: true,
        });
      } else {
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
      }

      emitRoomStateToRoom(room);
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

      let allReady = true;
      for (const p of room.players.values()) {
        if (!p.isReady) {
          allReady = false;
          break;
        }
      }
      if (!allReady) {
        socket.emit('SOCKET_ERROR', { code: 'PLAYERS_NOT_READY', message: 'All scholars must be marked Ready before starting.' });
        return;
      }

      room.startMatch();
    });

    // KICK SCHOLAR (Host Only, Private Rooms)
    socket.on('ROOM_KICK_PLAYER', ({ targetUserId }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (room.hostUserId !== user.userId) {
        socket.emit('SOCKET_ERROR', { code: 'FORBIDDEN', message: 'Only the host can kick players.' });
        return;
      }

      if (user.userId === targetUserId) {
        socket.emit('SOCKET_ERROR', { code: 'INVALID_ACTION', message: 'You cannot kick yourself.' });
        return;
      }

      const { success, error, kickedPlayer } = room.kickPlayer(user.userId, targetUserId);
      if (!success || !kickedPlayer) {
        socket.emit('SOCKET_ERROR', { code: 'KICK_FAILED', message: error || 'Failed to kick player.' });
        return;
      }

      // Find the target socket and notify them they were kicked
      for (const [, s] of io.sockets.sockets) {
        const sUser = (s.data as any)?.user;
        if (sUser?.userId === targetUserId) {
          s.leave(room.roomId);
          delete s.data.roomId;
          s.emit('ROOM_KICKED', { reason: `You were kicked from room ${room.roomCode} by the host.` });
          emitClearRoomState(s as AuthenticatedSocket);
        }
      }

      // Notify voice peers
      io.to(room.roomId).emit('VOICE_PEER_LEFT', { userId: targetUserId });

      // Notify remaining players in the room
      io.to(room.roomId).emit('ROOM_PLAYER_LEFT', { userId: targetUserId });
      emitRoomStateToRoom(room);

      // Broadcast system chat message to the room
      const systemMsg: RoomChatMessage = {
        id: `sys-kick-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.roomId,
        userId: 'system',
        username: 'System',
        text: `${kickedPlayer.username} was kicked from the room by the host.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      room.addChatMessage(systemMsg);
      io.to(room.roomId).emit('ROOM_CHAT_MESSAGE', systemMsg);

      console.log(`[Socket] Host ${user.username} kicked ${kickedPlayer.username} from room ${room.roomCode}`);
    });

    // SEND IN-ROOM CHAT MESSAGE
    socket.on('ROOM_SEND_CHAT', ({ text }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const player = room.players.get(user.userId);
      if (!player) return;

      if (!text || typeof text !== 'string') return;
      const trimmed = text.trim().slice(0, 200);
      if (!trimmed) return;

      const chatMsg: RoomChatMessage = {
        id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        roomId: room.roomId,
        userId: user.userId,
        username: user.username,
        avatarId: player.avatarId,
        text: trimmed,
        timestamp: Date.now(),
        isSystem: false,
      };

      room.addChatMessage(chatMsg);
      io.to(room.roomId).emit('ROOM_CHAT_MESSAGE', chatMsg);
    });

    // SUBMIT WORD
    socket.on('GAME_SUBMIT_WORD', ({ word, clientTimestamp }) => {
      if (!word || typeof word !== 'string' || !word.trim()) {
        return;
      }
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getWordRoom(roomId);
      if (!room) return;

      room.submitWord(user.userId, word, clientTimestamp);
    });

    // USE SKILL
    socket.on('GAME_USE_SKILL', ({ skillId }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getWordRoom(roomId);
      if (!room) return;

      room.useSkill(user.userId, skillId);
    });

    // REAL-TIME TYPING BROADCAST (Roblox style peer typing sync)
    socket.on('GAME_TYPING_UPDATE', ({ inputSuffix }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getWordRoom(roomId);
      if (!room || room.status !== 'IN_PROGRESS') return;

      const activeUserId = room.getActivePlayerId();
      if (activeUserId === user.userId) {
        socket.to(room.roomId).emit('GAME_PLAYER_TYPING', {
          userId: user.userId,
          inputSuffix: typeof inputSuffix === 'string' ? inputSuffix.slice(0, 46) : '',
        });
      }
    });

    // MATHBLITZ: SUBMIT RANDOM NUMBER PICK (1-99)
    socket.on('MATH_SUBMIT_PICK', ({ number }) => {
      const roomId = socket.data.roomId;
      if (!roomId || typeof number !== 'number') return;

      const room = roomManager.getMathRoom(roomId);
      if (!room) return;

      room.submitPick(user.userId, number);
    });

    // MATHBLITZ: SUBMIT EQUATION ANSWER
    socket.on('MATH_SUBMIT_ANSWER', ({ answer }) => {
      if (typeof answer !== 'string' || !answer.trim()) return;
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getMathRoom(roomId);
      if (!room) return;

      room.submitAnswer(user.userId, answer);
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
        emitRoomStateToRoom(room);
      }
    });

    // SYNC STATE
    socket.on('GAME_REQUEST_SYNC', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        emitRoomStateToSocket(socket, room);
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
      const isValidPlayer =
        room.gameType === 'MATHRACE' ? Boolean(player) : Boolean(player && (player as PlayerInGame).isAlive);

      if (!player || !isValidPlayer) {
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

      emitRoomStateToSocket(socket, room);
      if (room.gameType === 'WORDCHAIN') {
        const wordTurn = room.getSummary().turnState;
        if (wordTurn) {
          socket.emit('GAME_TURN_START', wordTurn);
        }
      }
      emitRoomStateToRoom(room);
      console.log(`[Socket] Scholar manually reconnected: ${user.username} to room ${room.roomCode}`);
    });

    // LEAVE ROOM
    socket.on('ROOM_LEAVE', () => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        emitClearRoomState(socket);
        return;
      }

      // Notify voice peers before leaving
      socket.to(roomId).emit('VOICE_PEER_LEFT', { userId: user.userId });

      // Leave socket channel immediately so no subsequent room state broadcasts reach this leaving socket
      socket.leave(roomId);
      delete socket.data.roomId;

      // Definitively clear the room state on this client
      emitClearRoomState(socket);

      const room = roomManager.getRoom(roomId);
      if (room) {
        const { newHostId, shouldClose } = room.removePlayer(user.userId);

        if (shouldClose) {
          roomManager.removeRoom(roomId);
        } else {
          io.to(roomId).emit('ROOM_PLAYER_LEFT', { userId: user.userId, newHostUserId: newHostId });
          emitRoomStateToRoom(room);
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
          emitRoomStateToRoom(room);
        }
      } else if (room.status === 'IN_PROGRESS') {
        if (room.gameType === 'MATHRACE') {
          const player = room.players.get(user.userId);
          if (player) {
            player.isDisconnected = true;
            player.disconnectedAt = Date.now();
            emitRoomStateToRoom(room);

            const timer = setTimeout(() => {
              disconnectTimers.delete(user.userId);
              const targetRoom = roomManager.getMathRoom(roomId);
              if (targetRoom && targetRoom.status === 'IN_PROGRESS') {
                const connectedHumans = Array.from(targetRoom.players.values()).filter(
                  (p) => !p.userId.startsWith('guest-bot-') && !p.isDisconnected
                );
                if (connectedHumans.length === 0) {
                  roomManager.removeRoom(roomId);
                }
              }
            }, 25000);

            disconnectTimers.set(user.userId, timer);
          }
          return;
        }

        const player = room.players.get(user.userId);
        if (player && player.isAlive) {
          player.isDisconnected = true;
          player.disconnectedAt = Date.now();
          io.to(roomId).emit('ROOM_STATE_UPDATE', room.getSummary());

          // 25-second grace window before auto-forfeit elimination
          const timer = setTimeout(() => {
            disconnectTimers.delete(user.userId);
            const targetRoom = roomManager.getWordRoom(roomId);
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

function getRejectionMessage(reason: string, word: string, language: GameLanguage = 'ENGLISH'): string {
  switch (reason) {
    case 'NOT_IN_DICTIONARY': {
      if (language === 'BISAYA') {
        return `'${word}' is not in the approved Bisaya dictionary.`;
      }
      if (language === 'TAGALOG') {
        return `'${word}' is not in the approved Tagalog dictionary.`;
      }
      if (language === 'MIXED') {
        return `'${word}' is not in the approved dictionary (English / Tagalog / Bisaya).`;
      }
      return `'${word}' is not in the approved English dictionary.`;
    }
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
