import {
  ClientToServerEvents,
  GameLanguage,
  GameMode,
  GameRoomSummary,
  GameTurnState,
  PlayerInGame,
  RankProgressionDelta,
  ServerToClientEvents,
  SkillType,
  WordRejectionReason,
} from '@wordchain/shared';
import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api.js';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: TypedSocket | null = null;
  private isConnecting: boolean = false;

  public getSocket(): TypedSocket {
    if (!this.socket) {
      this.connect();
    }
    return this.socket!;
  }

  public connect(): TypedSocket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;

    // Connect to server origin or configured remote backend with credentials
    const rawUrl = import.meta.env.VITE_SERVER_URL
      ? import.meta.env.VITE_SERVER_URL
      : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:4000'
          : window.location.origin);
    const targetUrl = rawUrl.replace(/\/+$/, '');

    this.socket = io(targetUrl, {
      withCredentials: true,
      auth: (cb) => {
        cb({ token: getStoredToken() });
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('[Socket] Connected to WordChain Real-Time Engine:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.warn('[Socket] Connection failed:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.log('[Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  // Emitters
  public joinQueue(mode: GameMode = 'CASUAL', language: GameLanguage = 'ENGLISH'): void {
    this.getSocket().emit('LOBBY_JOIN_QUEUE', { mode, language });
  }

  public leaveQueue(): void {
    this.getSocket().emit('LOBBY_LEAVE_QUEUE');
  }

  public reconnect(roomId: string): void {
    this.getSocket().emit('ROOM_RECONNECT', { roomId });
  }

  public createPrivateRoom(customTimerSec: number = 15, language: GameLanguage = 'ENGLISH'): void {
    this.getSocket().emit('ROOM_CREATE_PRIVATE', { customTimerSec, language });
  }

  public joinRoom(roomCode: string): void {
    this.getSocket().emit('ROOM_JOIN', { roomCode: roomCode.trim().toUpperCase() });
  }

  public leaveRoom(): void {
    this.getSocket().emit('ROOM_LEAVE');
  }

  public toggleReady(isReady: boolean): void {
    this.getSocket().emit('ROOM_READY_TOGGLE', { isReady });
  }

  public addGuestPlayer(): void {
    this.getSocket().emit('ROOM_ADD_GUEST');
  }

  public startMatch(): void {
    this.getSocket().emit('ROOM_START_MATCH');
  }

  public kickPlayer(targetUserId: string): void {
    this.getSocket().emit('ROOM_KICK_PLAYER', { targetUserId });
  }

  public sendChatMessage(text: string): void {
    this.getSocket().emit('ROOM_SEND_CHAT', { text });
  }

  public submitWord(word: string): void {
    this.getSocket().emit('GAME_SUBMIT_WORD', {
      word: word.trim().toUpperCase(),
      clientTimestamp: Date.now(),
    });
  }

  public useSkill(skillId: SkillType): void {
    this.getSocket().emit('GAME_USE_SKILL', { skillId });
  }

  public sendTypingUpdate(inputSuffix: string): void {
    this.getSocket().emit('GAME_TYPING_UPDATE', { inputSuffix });
  }

  public resetRematch(): void {
    this.getSocket().emit('ROOM_RESET_REMATCH');
  }

  public requestSync(): void {
    this.getSocket().emit('GAME_REQUEST_SYNC');
  }

  // Voice Chat Emitters
  public sendVoiceSignal(targetUserId: string, signal: any): void {
    this.getSocket().emit('VOICE_SIGNAL', { targetUserId, signal });
  }

  public sendVoiceState(isMuted: boolean, isSpeaking?: boolean): void {
    this.getSocket().emit('VOICE_STATE_UPDATE', { isMuted, isSpeaking });
  }

  public joinVoiceRoom(): void {
    this.getSocket().emit('VOICE_JOIN_ROOM');
  }

  public leaveVoiceRoom(): void {
    this.getSocket().emit('VOICE_LEAVE_ROOM');
  }
}

export const socketService = new SocketService();
