import { AcademicRankTier } from './ranking.types.js';

export type GameMode = 'CASUAL' | 'RANKED' | 'PRIVATE';

export type GameLanguage = 'ENGLISH' | 'TAGALOG' | 'BISAYA' | 'MIXED';

export type RoomStatus = 'WAITING' | 'COUNTDOWN' | 'IN_PROGRESS' | 'FINISHED' | 'ABORTED';

export type WordRejectionReason =
  | 'NOT_IN_DICTIONARY'
  | 'ALREADY_USED'
  | 'INVALID_PREFIX'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NOT_YOUR_TURN'
  | 'RATE_LIMITED'
  | 'GAME_NOT_ACTIVE';

export interface PlayerInGame {
  userId: string;
  username: string;
  avatarId: string;
  tier: AcademicRankTier;
  division: number;
  isAlive: boolean;
  isReady: boolean;
  lives?: number; // 3 lives per match
  placement?: number;
  wordsSubmitted: number;
  isDisconnected: boolean;
  disconnectedAt?: number;
}

export interface GameTurnState {
  roundNumber: number;
  activeUserId: string;
  requiredLetter: string;
  turnDurationSec: number;
  turnDeadlineUtc: number; // Server epoch ms
  serverNowUtc: number;
}

export interface GameRoomSummary {
  roomId: string;
  roomCode: string;
  mode: GameMode;
  language?: GameLanguage;
  status: RoomStatus;
  hostUserId: string;
  players: PlayerInGame[];
  currentWord: string;
  requiredLetter: string;
  turnState?: GameTurnState;
  spectatorsCount: number;
  historyWords: string[];
}
