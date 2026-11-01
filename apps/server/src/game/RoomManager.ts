import { GameMode } from '@wordchain/shared';
import { GameRoom, GameRoomOptions } from './GameRoom.js';

export class RoomManager {
  private static instance: RoomManager | null = null;
  private rooms: Map<string, GameRoom> = new Map();
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

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByCode(code: string): GameRoom | undefined {
    const normalized = code.trim().toUpperCase();
    const roomId = this.codeIndex.get(normalized);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
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
      if (room.mode === 'CASUAL' && room.status === 'WAITING' && room.players.size < 4) {
        return room;
      }
    }
    return undefined;
  }

  public findAvailableRankedRoom(): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.mode === 'RANKED' && room.status === 'WAITING' && room.players.size < 4) {
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
