import { GameMode, RoomChatMessage, RoomStatus } from './game.types.js';
import { AcademicRankTier } from './ranking.types.js';

export type MathOperation = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';
export type MathOperationMode = 'MIXED' | MathOperation;
export type MathPhase = 'WAITING' | 'COUNTDOWN' | 'PICKING' | 'RACING' | 'ROUND_RESULT' | 'FINISHED';

export interface MathPlayerInGame {
  userId: string;
  username: string;
  avatarId: string;
  tier: AcademicRankTier;
  division: number;
  isReady: boolean;
  isDisconnected: boolean;
  disconnectedAt?: number;
  score: number;
  hasPicked: boolean;
  pickedNumber?: number;
  solvedThisRound: boolean;
  roundPlacement?: number;
  roundPointsEarned?: number;
  lockedOutThisRound: boolean;
  totalSolveTimeMs: number;
  firstPlaceFinishes: number;
  placement?: number;
}

export interface MathPlayerPickDisplay {
  userId: string;
  username: string;
  number: number;
}

export interface MathRoundState {
  roundNumber: number;
  totalRounds: number;
  phase: MathPhase;
  operation: MathOperation;
  pickOptions: number[];
  picks?: MathPlayerPickDisplay[];
  equationDisplay?: string;
  choices?: string[];
  phaseDurationSec: number;
  phaseDeadlineUtc: number;
  serverNowUtc: number;
}

export interface MathRoomSummary {
  roomId: string;
  roomCode: string;
  gameType: 'MATHRACE';
  mode: GameMode;
  operationMode: MathOperationMode;
  status: RoomStatus;
  hostUserId: string;
  maxPlayers: number;
  players: MathPlayerInGame[];
  roundState?: MathRoundState;
  chatHistory?: RoomChatMessage[];
}

export interface MathRoundResultPayload {
  roundNumber: number;
  totalRounds: number;
  operation: MathOperation;
  equationDisplay: string;
  correctAnswer: string;
  picks: MathPlayerPickDisplay[];
  standings: MathPlayerInGame[];
}
