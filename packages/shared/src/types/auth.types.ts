import { GameType } from './game.types.js';
import { AcademicRankTier } from './ranking.types.js';

export interface GameRankStanding {
  tier: AcademicRankTier;
  division: number;
  rankExp: number;
  scientistPoints: number;
  hiddenMmr: number;
  seasonMatches?: number;
  seasonWins?: number;
}

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'BANNED';

export interface User {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerProfile {
  userId: string;
  avatarId: string;
  accountLevel: number;
  lifetimeXp: number;
  totalMatches: number;
  totalWins: number;
  totalWordsPlayed: number;
  longestWord: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  profile: PlayerProfile;
  currentRank: {
    tier: AcademicRankTier;
    division: number;
    rankExp: number;
    scientistPoints: number;
    hiddenMmr: number;
  };
  gameRanks?: Record<GameType, GameRankStanding>;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName?: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface AuthSuccessResponse {
  success: true;
  message: string;
  user: AuthenticatedUser;
  token?: string;
}

export interface AuthErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
