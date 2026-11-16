import {
  ChessEndReason,
  ChessGameStateSnapshot,
  ChessMoveRecord,
  ChessPieceType,
  ChessPlayerInGame,
  ChessRoomSummary,
  ChessVariant,
} from './chess.types.js';
import {
  GameLanguage,
  GameMode,
  GameRoomSummary,
  GameTurnState,
  GameType,
  PlayerInGame,
  RoomChatMessage,
  SkillActivationPayload,
  SkillType,
  WordRejectionReason,
} from './game.types.js';
import {
  MathDifficulty,
  MathOperation,
  MathOperationMode,
  MathPlayerInGame,
  MathPlayerPickDisplay,
  MathRoomSummary,
  MathRoundResultPayload,
} from './math.types.js';
import {
  ImpostorPlayerInGame,
  ImpostorResolvedCategory,
  ImpostorRoomSummary,
  ImpostorSettings,
  ImpostorWinnerFaction,
} from './impostor.types.js';
import { RankProgressionDelta } from './ranking.types.js';

export interface ClientToServerEvents {
  // Lobby & Matchmaking
  LOBBY_JOIN_QUEUE: (payload: {
    gameType?: GameType;
    mode: GameMode;
    language?: GameLanguage;
    operationMode?: MathOperationMode;
    difficulty?: MathDifficulty;
    chessVariant?: ChessVariant;
    clockSec?: number;
  }) => void;
  LOBBY_LEAVE_QUEUE: () => void;
  ROOM_CREATE_PRIVATE: (payload?: {
    gameType?: GameType;
    customTimerSec?: number;
    language?: GameLanguage;
    operationMode?: MathOperationMode;
    difficulty?: MathDifficulty;
    chessVariant?: ChessVariant;
    incrementSec?: number;
    impostorSettings?: Partial<ImpostorSettings>;
  }) => void;
  ROOM_JOIN: (payload: { roomCode: string }) => void;
  ROOM_LEAVE: () => void;
  ROOM_READY_TOGGLE: (payload: { isReady: boolean }) => void;
  ROOM_ADD_GUEST: () => void;
  ROOM_START_MATCH: () => void;
  ROOM_KICK_PLAYER: (payload: { targetUserId: string }) => void;
  ROOM_SEND_CHAT: (payload: { text: string }) => void;

  // WordChain Active Gameplay
  GAME_SUBMIT_WORD: (payload: { word: string; clientTimestamp: number }) => void;
  GAME_TYPING_UPDATE: (payload: { inputSuffix: string }) => void;
  GAME_USE_SKILL: (payload: { skillId: SkillType }) => void;
  ROOM_RESET_REMATCH: () => void;
  GAME_REQUEST_SYNC: () => void;
  CLOCK_SYNC_PING: (payload: { clientPing: number }) => void;

  // MathBlitz Active Gameplay
  MATH_SUBMIT_PICK: (payload: { number: number }) => void;
  MATH_SUBMIT_ANSWER: (payload: { answer: string }) => void;

  // Chess Active Gameplay
  CHESS_MAKE_MOVE: (payload: { from: string; to: string; promotion?: ChessPieceType }) => void;
  CHESS_RESIGN: () => void;

  // Who Is The Impostor Setup & Active Gameplay
  IMPOSTOR_UPDATE_SETTINGS: (payload: Partial<ImpostorSettings>) => void;
  IMPOSTOR_READY_TO_VOTE: (payload: { ready: boolean }) => void;
  IMPOSTOR_CAST_VOTE: (payload: { targetUserId: string | 'SKIP' }) => void;

  // Reconnection
  ROOM_RECONNECT: (payload: { roomId: string; sessionToken?: string }) => void;

  // WebRTC Open Mic Voice Chat (Private Rooms)
  VOICE_SIGNAL: (payload: { targetUserId: string; signal: any }) => void;
  VOICE_STATE_UPDATE: (payload: { isMuted: boolean; isSpeaking?: boolean }) => void;
  VOICE_JOIN_ROOM: () => void;
  VOICE_LEAVE_ROOM: () => void;
}

export interface ServerToClientEvents {
  // Queue & Matchmaking Status
  QUEUE_STATUS: (payload: {
    inQueue: boolean;
    gameType?: GameType;
    mode?: GameMode;
    language?: GameLanguage;
    operationMode?: MathOperationMode;
    difficulty?: MathDifficulty;
    chessVariant?: ChessVariant;
    position?: number;
    estimatedWaitSec?: number;
  }) => void;
  MATCH_FOUND: (payload: {
    roomId: string;
    gameType?: GameType;
    mode: GameMode;
    language?: GameLanguage;
    operationMode?: MathOperationMode;
    difficulty?: MathDifficulty;
    chessVariant?: ChessVariant;
    countdownSec: number;
  }) => void;

  // WordChain Room & Turn Events
  ROOM_STATE_UPDATE: (payload: GameRoomSummary | null) => void;
  ROOM_PLAYER_JOINED: (payload: { player: PlayerInGame }) => void;
  ROOM_PLAYER_LEFT: (payload: { userId: string; newHostUserId?: string }) => void;
  ROOM_COUNTDOWN_TICK: (payload: { remainingSec: number }) => void;
  GAME_TURN_START: (payload: GameTurnState) => void;
  GAME_PLAYER_TYPING: (payload: { userId: string; inputSuffix: string }) => void;
  GAME_WORD_ACCEPTED: (payload: {
    word: string;
    acceptedByUserId: string;
    nextLetter: string;
    nextUserId: string;
    turnDurationMs: number;
    roundNumber: number;
    timePenaltySec?: number;
    penalizedUserId?: string;
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
  GAME_LIFE_LOST: (payload: {
    userId: string;
    livesRemaining: number;
  }) => void;
  GAME_SKILL_ACTIVATED: (payload: SkillActivationPayload) => void;
  GAME_SKILL_REJECTED: (payload: {
    skillId: SkillType;
    reason: string;
    userId?: string;
  }) => void;
  GAME_MATCH_ENDED: (payload: {
    winnerId: string;
    standings: PlayerInGame[];
    deltas: Record<string, RankProgressionDelta>;
  }) => void;

  // MathBlitz Room & Round Events
  MATH_ROOM_STATE_UPDATE: (payload: MathRoomSummary | null) => void;
  MATH_ROUND_PICK_START: (payload: {
    roundNumber: number;
    totalRounds: number;
    operation: MathOperation;
    difficulty: MathDifficulty;
    pickOptions: number[];
    durationSec: number;
    deadlineUtc: number;
    serverNowUtc: number;
  }) => void;
  MATH_PLAYER_PICKED: (payload: { userId: string }) => void;
  MATH_ROUND_RACE_START: (payload: {
    roundNumber: number;
    totalRounds: number;
    operation: MathOperation;
    difficulty: MathDifficulty;
    picks: MathPlayerPickDisplay[];
    equationDisplay: string;
    choices?: string[];
    durationSec: number;
    deadlineUtc: number;
    serverNowUtc: number;
  }) => void;
  MATH_PLAYER_SOLVED: (payload: {
    userId: string;
    username: string;
    placement: number;
    pointsEarned: number;
    totalScore: number;
    solveTimeMs: number;
  }) => void;
  MATH_ANSWER_REJECTED: (payload: {
    reason: 'WRONG_ANSWER' | 'LOCKED_OUT' | 'ALREADY_SOLVED' | 'NOT_RACING';
    message: string;
    lockedOut: boolean;
  }) => void;
  MATH_ROUND_ENDED: (payload: MathRoundResultPayload) => void;
  MATH_MATCH_ENDED: (payload: {
    winnerId: string;
    standings: MathPlayerInGame[];
    deltas: Record<string, RankProgressionDelta>;
  }) => void;

  // Chess Room & Match Events
  CHESS_ROOM_STATE_UPDATE: (payload: ChessRoomSummary | null) => void;
  CHESS_MOVE_APPLIED: (payload: {
    move: ChessMoveRecord;
    gameState: ChessGameStateSnapshot;
    turnStartedAtUtc: number;
    players: ChessPlayerInGame[];
  }) => void;
  CHESS_MOVE_REJECTED: (payload: {
    reason: string;
    message: string;
  }) => void;
  CHESS_PLAYER_ELIMINATED: (payload: {
    userId: string;
    seat: number;
    placement: number;
    reason: ChessEndReason;
  }) => void;
  CHESS_MATCH_ENDED: (payload: {
    winnerId: string;
    isDraw?: boolean;
    drawReason?: ChessEndReason;
    standings: ChessPlayerInGame[];
    deltas: Record<string, RankProgressionDelta>;
  }) => void;

  // Who Is The Impostor Room & Match Events
  IMPOSTOR_ROOM_STATE_UPDATE: (payload: ImpostorRoomSummary | null) => void;
  IMPOSTOR_MATCH_ENDED: (payload: {
    winnerFaction: ImpostorWinnerFaction;
    secretWord: string;
    impostorHint: string;
    resolvedCategory: ImpostorResolvedCategory;
    players: ImpostorPlayerInGame[];
  }) => void;

  // Latency & Time Sync
  CLOCK_SYNC_PONG: (payload: { clientPing: number; serverTimestamp: number }) => void;

  // WebRTC Open Mic Voice Chat (Private Rooms)
  VOICE_SIGNAL: (payload: { senderUserId: string; signal: any }) => void;
  VOICE_STATE_UPDATE: (payload: { userId: string; isMuted: boolean; isSpeaking?: boolean }) => void;
  VOICE_PEER_JOINED: (payload: { userId: string }) => void;
  VOICE_PEER_LEFT: (payload: { userId: string }) => void;

  // General Notification / Error
  ROOM_KICKED: (payload: { reason?: string }) => void;
  ROOM_CHAT_MESSAGE: (payload: RoomChatMessage) => void;
  SOCKET_ERROR: (payload: { code: string; message: string }) => void;
}
