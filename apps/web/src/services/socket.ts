import {
  ClientToServerEvents,
  GameMode,
  GameRoomSummary,
  GameTurnState,
  PlayerInGame,
  RankProgressionDelta,
  ServerToClientEvents,
  WordRejectionReason,
} from '@wordchain/shared';
import { io, Socket } from 'socket.io-client';

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

    // Connect to server origin or current host with credentials
    const targetUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000'
      : window.location.origin;

    this.socket = io(targetUrl, {
      withCredentials: true,
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
  public joinQueue(mode: GameMode = 'CASUAL'): void {
    this.getSocket().emit('LOBBY_JOIN_QUEUE', { mode });
  }

  public leaveQueue(): void {
    this.getSocket().emit('LOBBY_LEAVE_QUEUE');
  }

  public reconnect(roomId: string): void {
    this.getSocket().emit('ROOM_RECONNECT', { roomId });
  }

  public createPrivateRoom(customTimerSec: number = 15): void {
    this.getSocket().emit('ROOM_CREATE_PRIVATE', { customTimerSec });
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

  public startMatch(): void {
    this.getSocket().emit('ROOM_START_MATCH');
  }

  public submitWord(word: string): void {
    this.getSocket().emit('GAME_SUBMIT_WORD', {
      word: word.trim().toUpperCase(),
      clientTimestamp: Date.now(),
    });
  }

  public requestSync(): void {
    this.getSocket().emit('GAME_REQUEST_SYNC');
  }
}

export const socketService = new SocketService();
