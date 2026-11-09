import { GameMode, GameRoomSummary, GameTurnState, PlayerInGame, WordRejectionReason } from './game.types.js';
import { RankProgressionDelta } from './ranking.types.js';

export interface ClientToServerEvents {
  // Lobby & Matchmaking
  LOBBY_JOIN_QUEUE: (payload: { mode: GameMode }) => void;
  LOBBY_LEAVE_QUEUE: () => void;
  ROOM_CREATE_PRIVATE: (payload?: { customTimerSec?: number }) => void;
  ROOM_JOIN: (payload: { roomCode: string }) => void;
  ROOM_LEAVE: () => void;
  ROOM_READY_TOGGLE: (payload: { isReady: boolean }) => void;
  ROOM_START_MATCH: () => void;

  // Active Gameplay
  GAME_SUBMIT_WORD: (payload: { word: string; clientTimestamp: number }) => void;
  GAME_TYPING_UPDATE: (payload: { inputSuffix: string }) => void;
  ROOM_RESET_REMATCH: () => void;
  GAME_REQUEST_SYNC: () => void;
  CLOCK_SYNC_PING: (payload: { clientPing: number }) => void;

  // Reconnection
  ROOM_RECONNECT: (payload: { roomId: string; sessionToken?: string }) => void;
}

export interface ServerToClientEvents {
  // Queue & Matchmaking Status
  QUEUE_STATUS: (payload: { inQueue: boolean; mode?: GameMode; position?: number; estimatedWaitSec?: number }) => void;
  MATCH_FOUND: (payload: { roomId: string; mode: GameMode; countdownSec: number }) => void;

  // Room State
  ROOM_STATE_UPDATE: (payload: GameRoomSummary) => void;
  ROOM_PLAYER_JOINED: (payload: { player: PlayerInGame }) => void;
  ROOM_PLAYER_LEFT: (payload: { userId: string; newHostUserId?: string }) => void;
  ROOM_COUNTDOWN_TICK: (payload: { remainingSec: number }) => void;

  // Real-Time Turn Events
  GAME_TURN_START: (payload: GameTurnState) => void;
  GAME_PLAYER_TYPING: (payload: { userId: string; inputSuffix: string }) => void;
  GAME_WORD_ACCEPTED: (payload: {
    word: string;
    acceptedByUserId: string;
    nextLetter: string;
    nextUserId: string;
    turnDurationMs: number;
    roundNumber: number;
  }) => void;
  GAME_WORD_REJECTED: (payload: {
    word: string;
    reason: WordRejectionReason;
    message: string;
  }) => void;
  GAME_LETTER_EXHAUSTED: (payload: {
    exhaustedLetter: string;
    newLetter: string;
    awardedBonusToUserId: string;
  }) => void;
  GAME_PLAYER_ELIMINATED: (payload: {
    userId: string;
    placement: number;
    reason: 'TIMEOUT' | 'FORFEIT' | 'DISCONNECT';
  }) => void;
  GAME_MATCH_ENDED: (payload: {
    winnerId: string;
    standings: PlayerInGame[];
    deltas: Record<string, RankProgressionDelta>;
  }) => void;

  // Latency & Time Sync
  CLOCK_SYNC_PONG: (payload: { clientPing: number; serverTimestamp: number }) => void;

  // General Notification / Error
  SOCKET_ERROR: (payload: { code: string; message: string }) => void;
}
