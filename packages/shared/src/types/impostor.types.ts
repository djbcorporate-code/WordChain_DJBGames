import { GameMode, RoomChatMessage, RoomStatus } from './game.types.js';

export type ImpostorDifficultyTier = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type ImpostorDifficulty = 'ALL' | ImpostorDifficultyTier;

export type ImpostorConcreteCategoryId =
  | 'FOOD_DRINKS'
  | 'ANIMALS'
  | 'HOUSEHOLD_OBJECTS'
  | 'SCHOOL_EDUCATION'
  | 'PLAYER_NAMES'
  | 'SPORTS'
  | 'COUNTRIES_PLACES'
  | 'MOVIES_TV'
  | 'JOBS_PROFESSIONS'
  | 'TECH_GADGETS'
  | 'BRANDS_PRODUCTS'
  | 'FILIPINO_CULTURE'
  | 'MOBILE_LEGENDS_HEROES'
  | 'DOTA2_HEROES'
  | 'LOVE_RELATIONSHIPS'
  | 'FILIPINO_SLANG'
  | 'EMOTIONS_FEELINGS'
  | 'ABSTRACT_CONCEPTS';

export type ImpostorCategoryId = 'RANDOM' | ImpostorConcreteCategoryId;

export interface ImpostorCategoryMeta {
  id: ImpostorConcreteCategoryId;
  label: string;
  emoji: string;
  difficulty: ImpostorDifficultyTier;
  description: string;
  isDynamic?: boolean;
}

export interface ImpostorSettings {
  category: ImpostorCategoryId;
  difficulty: ImpostorDifficulty;
  impostorCount: number; // 1-3 (clamped at start based on player count)
  conversationSec: number; // 30-180
}

export const IMPOSTOR_MIN_PLAYERS = 3;
export const IMPOSTOR_MAX_PLAYERS = 10;
export const IMPOSTOR_ROLE_REVEAL_SEC = 6;
export const IMPOSTOR_VOTING_SEC = 35;
export const IMPOSTOR_EJECTION_SEC = 5;
export const IMPOSTOR_CONVERSATION_PRESETS = [30, 60, 90, 120, 180] as const;

export const DEFAULT_IMPOSTOR_SETTINGS: ImpostorSettings = {
  category: 'RANDOM',
  difficulty: 'ALL',
  impostorCount: 1,
  conversationSec: 90,
};

export type ImpostorPhase =
  | 'ROLE_REVEAL'
  | 'CONVERSATION'
  | 'VOTING'
  | 'EJECTION'
  | 'FINISHED';

export type ImpostorRole = 'CREWMATE' | 'IMPOSTOR';
export type ImpostorWinnerFaction = 'CREWMATES' | 'IMPOSTORS';

export interface ImpostorPlayerInGame {
  userId: string;
  username: string;
  avatarId: string;
  isAlive: boolean;
  isReady: boolean;
  readyToVote: boolean;
  isDisconnected: boolean;
  disconnectedAt?: number;
  hasVoted: boolean;
  votesReceived: number;
  /** Revealed strictly after ejection or at match FINISHED */
  revealedRole?: ImpostorRole;
}

export interface ImpostorEjectionResult {
  roundNumber: number;
  outcome: 'EJECTED' | 'TIE' | 'SKIPPED';
  ejectedUserId?: string;
  ejectedUsername?: string;
  ejectedRole?: ImpostorRole;
  remainingImpostors: number;
  voteCounts: Record<string, number>;
}

export interface ImpostorResolvedCategory {
  id: ImpostorConcreteCategoryId;
  label: string;
  emoji: string;
  difficulty: ImpostorDifficultyTier;
}

export interface ImpostorRoomSummary {
  roomId: string;
  roomCode: string;
  gameType: 'IMPOSTOR';
  mode: GameMode;
  status: RoomStatus;
  hostUserId: string;
  settings: ImpostorSettings;
  minPlayers: number;
  maxPlayers: number;
  players: ImpostorPlayerInGame[];
  phase?: ImpostorPhase;
  roundNumber: number;
  phaseStartedAtUtc?: number;
  phaseDeadlineUtc?: number;
  serverNowUtc: number;
  resolvedCategory?: ImpostorResolvedCategory;
  /** Recipient-specific private mission fields */
  myRole?: ImpostorRole;
  /** Shown ONLY to Crewmates during active play, and to all players once FINISHED */
  secretWord?: string;
  /** Shown ONLY to Impostors during active play, and to all players once FINISHED */
  impostorHint?: string;
  /** Other impostor IDs visible only to Impostors (and revealed to all at FINISHED) */
  allyImpostorIds?: string[];
  myVoteTargetId?: string | 'SKIP';
  lastEjection?: ImpostorEjectionResult;
  winnerFaction?: ImpostorWinnerFaction;
  chatHistory?: RoomChatMessage[];
}
