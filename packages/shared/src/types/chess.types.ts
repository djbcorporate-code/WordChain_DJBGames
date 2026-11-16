import { GameMode, RoomChatMessage, RoomStatus } from './game.types.js';
import { AcademicRankTier } from './ranking.types.js';

export type ChessVariant = '2P' | '3P' | '4P';

export type ChessColor = 'WHITE' | 'BLACK' | 'RED' | 'YELLOW' | 'BLUE' | 'GREEN';

export type ChessPieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

export type ChessEndReason =
  | 'CHECKMATE'
  | 'FLAGGED'
  | 'RESIGN'
  | 'FORFEIT'
  | 'STALEMATE'
  | 'DRAW_STALEMATE'
  | 'DRAW_FIFTY_MOVE'
  | 'WINNER';

export interface ChessPoint2D {
  x: number;
  y: number;
}

export interface ChessPiece {
  id: string;
  seat: number;
  color: ChessColor;
  type: ChessPieceType;
  hasMoved: boolean;
}

export interface ChessEnPassantTarget {
  targetCellId: string;
  pawnCellId: string;
  ownerSeat: number;
}

export interface ChessSeatMeta {
  seat: number;
  color: ChessColor;
  label: string;
  fillHex: string;
  strokeHex: string;
  textHex: string;
  perspectiveDeg: number;
}

export interface ChessCellMeta {
  id: string;
  label: string;
  light: boolean;
  center: ChessPoint2D;
  polygon: ChessPoint2D[];
  // Local grid identifiers:
  // 2P & 4P: row, col
  // 3P: sector (0..5), u (0..3), v (0..3)
  row?: number;
  col?: number;
  sector?: number;
  u?: number;
  v?: number;
}

export interface ChessMoveInput {
  from: string;
  to: string;
  promotion?: ChessPieceType;
}

export interface ChessMoveRecord {
  moveNumber: number;
  seat: number;
  color: ChessColor;
  from: string;
  to: string;
  piece: ChessPieceType;
  captured?: { seat: number; color: ChessColor; type: ChessPieceType };
  promotion?: ChessPieceType;
  isCastle?: boolean;
  isEnPassant?: boolean;
  givesCheckToSeats?: number[];
  eliminatedSeat?: number;
  notation: string;
  timestamp: number;
}

export interface ChessPlayerInGame {
  userId: string;
  username: string;
  avatarId: string;
  tier: AcademicRankTier;
  division: number;
  seat: number;
  color: ChessColor;
  isReady: boolean;
  isAlive: boolean;
  isDisconnected: boolean;
  disconnectedAt?: number;
  timeRemainingMs: number;
  movesPlayed: number;
  capturesCount: number;
  placement?: number;
  eliminatedReason?: ChessEndReason;
}

export interface ChessGameStateSnapshot {
  variant: ChessVariant;
  pieces: Record<string, ChessPiece>;
  activeSeat: number;
  eliminatedSeats: number[];
  inCheckSeats: number[];
  enPassantTargets: ChessEnPassantTarget[];
  halfMoveClock: number;
  turnCount: number;
  moveHistory: ChessMoveRecord[];
  lastMove?: { from: string; to: string };
  winnerSeat?: number;
  isDraw?: boolean;
  drawReason?: ChessEndReason;
}

export interface ChessRoomSummary {
  roomId: string;
  roomCode: string;
  gameType: 'CHESS';
  variant: ChessVariant;
  mode: GameMode;
  status: RoomStatus;
  hostUserId: string;
  maxPlayers: number;
  clockSec: number;
  incrementSec: number;
  turnStartedAtUtc: number;
  players: ChessPlayerInGame[];
  gameState?: ChessGameStateSnapshot;
  chatHistory?: RoomChatMessage[];
}
