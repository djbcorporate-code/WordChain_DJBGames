import { PlayerInGame, RoomChatMessage } from '@wordchain/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameRoom } from '../GameRoom.js';

describe('Private Room Lobby Features (Kick & Chat)', () => {
  let room: GameRoom;

  const hostPlayer: PlayerInGame = {
    userId: 'user-host',
    username: 'HostScholar',
    avatarId: 'avatar_01',
    tier: 'HIGH_SCHOOL',
    division: 1,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  };

  const guestPlayer: PlayerInGame = {
    userId: 'user-guest',
    username: 'GuestScholar',
    avatarId: 'avatar_02',
    tier: 'NURSERY',
    division: 3,
    isAlive: true,
    isReady: false,
    wordsSubmitted: 0,
    isDisconnected: false,
  };

  beforeEach(() => {
    room = new GameRoom({
      roomId: 'room-test-123',
      roomCode: 'TEST99',
      mode: 'PRIVATE',
      language: 'MIXED',
      hostUserId: 'user-host',
    });

    room.addPlayer(hostPlayer);
    room.addPlayer(guestPlayer);
  });

  describe('Player Kick Functionality', () => {
    it('should allow the host to kick another player from the room', () => {
      expect(room.players.size).toBe(2);
      expect(room.players.has('user-guest')).toBe(true);

      const result = room.kickPlayer('user-host', 'user-guest');
      expect(result.success).toBe(true);
      expect(result.kickedPlayer?.userId).toBe('user-guest');
      expect(room.players.size).toBe(1);
      expect(room.players.has('user-guest')).toBe(false);
    });

    it('should prevent non-hosts from kicking players', () => {
      const result = room.kickPlayer('user-guest', 'user-host');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the host can kick players');
      expect(room.players.size).toBe(2);
    });

    it('should prevent the host from kicking themselves', () => {
      const result = room.kickPlayer('user-host', 'user-host');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Host cannot kick themselves');
      expect(room.players.size).toBe(2);
    });

    it('should return an error when kicking a nonexistent player', () => {
      const result = room.kickPlayer('user-host', 'nonexistent-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Player not found');
    });
  });

  describe('In-Room Chat Box', () => {
    it('should store chat messages and include them in room summary', () => {
      const msg: RoomChatMessage = {
        id: 'msg-1',
        roomId: 'room-test-123',
        userId: 'user-host',
        username: 'HostScholar',
        text: 'Hello scholars! Welcome to the match.',
        timestamp: Date.now(),
        isSystem: false,
      };

      room.addChatMessage(msg);
      expect(room.getChatHistory()).toHaveLength(1);
      expect(room.getChatHistory()[0].text).toBe('Hello scholars! Welcome to the match.');

      const summary = room.getSummary();
      expect(summary.chatHistory).toBeDefined();
      expect(summary.chatHistory).toHaveLength(1);
      expect(summary.chatHistory?.[0].username).toBe('HostScholar');
    });

    it('should cap chat history to the most recent 50 messages', () => {
      for (let i = 0; i < 60; i++) {
        room.addChatMessage({
          id: `msg-${i}`,
          roomId: 'room-test-123',
          userId: 'user-host',
          username: 'HostScholar',
          text: `Message ${i}`,
          timestamp: Date.now() + i,
        });
      }

      const history = room.getChatHistory();
      expect(history).toHaveLength(50);
      expect(history[0].text).toBe('Message 10');
      expect(history[49].text).toBe('Message 59');
    });
  });
});
