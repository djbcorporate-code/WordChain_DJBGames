import { GameMode } from '@wordchain/shared';
import { ChessGameRoom, ChessGameRoomOptions } from './chess/ChessGameRoom.js';
import { GameRoom, GameRoomOptions } from './GameRoom.js';
import { ImpostorGameRoom, ImpostorGameRoomOptions } from './impostor/ImpostorGameRoom.js';
import { MathGameRoom, MathGameRoomOptions } from './math/MathGameRoom.js';

export type AnyGameRoom = GameRoom | MathGameRoom | ChessGameRoom | ImpostorGameRoom;

export class RoomManager {
  private static instance: RoomManager | null = null;
  private rooms: Map<string, AnyGameRoom> = new Map();
  private codeIndex: Map<string, string> = new Map();

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public createRoom(options: GameRoomOptions): GameRoom {
    const room = new GameRoom(options);
    this.rooms.set(room.roomId, room);
    this.codeIndex.set(room.roomCode.toUpperCase(), room.roomId);
    return room;
  }

  public createMathRoom(options: MathGameRoomOptions): MathGameRoom {
    const room = new MathGameRoom(options);
    this.rooms.set(room.roomId, room);
    this.codeIndex.set(room.roomCode.toUpperCase(), room.roomId);
    return room;
  }

  public createChessRoom(options: ChessGameRoomOptions): ChessGameRoom {
    const room = new ChessGameRoom(options);
    this.rooms.set(room.roomId, room);
    this.codeIndex.set(room.roomCode.toUpperCase(), room.roomId);
    return room;
  }

  public createImpostorRoom(options: ImpostorGameRoomOptions): ImpostorGameRoom {
    const room = new ImpostorGameRoom(options);
    this.rooms.set(room.roomId, room);
    this.codeIndex.set(room.roomCode.toUpperCase(), room.roomId);
    return room;
  }

  public getRoom(roomId: string): AnyGameRoom | undefined {
    if (!roomId || typeof roomId !== 'string') return undefined;
    return this.rooms.get(roomId);
  }

  public getWordRoom(roomId: string): GameRoom | undefined {
    const room = this.getRoom(roomId);
    return room && room.gameType === 'WORDCHAIN' ? room : undefined;
  }

  public getMathRoom(roomId: string): MathGameRoom | undefined {
    const room = this.getRoom(roomId);
    return room && room.gameType === 'MATHRACE' ? room : undefined;
  }

  public getChessRoom(roomId: string): ChessGameRoom | undefined {
    const room = this.getRoom(roomId);
    return room && room.gameType === 'CHESS' ? room : undefined;
  }

  public getImpostorRoom(roomId: string): ImpostorGameRoom | undefined {
    const room = this.getRoom(roomId);
    return room && room.gameType === 'IMPOSTOR' ? room : undefined;
  }

  public getRoomByCode(code: string): AnyGameRoom | undefined {
    if (!code || typeof code !== 'string') return undefined;
    const normalized = code.trim().toUpperCase();
    const roomId = this.codeIndex.get(normalized);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  public getAllRooms(): AnyGameRoom[] {
    return Array.from(this.rooms.values());
  }

  public removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeIndex.delete(room.roomCode.toUpperCase());
      room.cleanup();
      this.rooms.delete(roomId);
    }
  }

  public findAvailableCasualRoom(): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.gameType === 'WORDCHAIN' && room.mode === 'CASUAL' && room.status === 'WAITING' && room.players.size < 4) {
        return room;
      }
    }
    return undefined;
  }

  public findAvailableRankedRoom(): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.gameType === 'WORDCHAIN' && room.mode === 'RANKED' && room.status === 'WAITING' && room.players.size < room.maxPlayers) {
        return room;
      }
    }
    return undefined;
  }

  public getActiveRoomsCount(): number {
    return this.rooms.size;
  }

  public clearAll(): void {
    for (const room of this.rooms.values()) {
      room.cleanup();
    }
    this.rooms.clear();
    this.codeIndex.clear();
  }
}
