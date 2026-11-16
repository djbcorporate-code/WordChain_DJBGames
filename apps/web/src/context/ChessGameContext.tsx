import {
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_DEFAULT_INCREMENT_SEC,
  ChessEndReason,
  ChessGameStateSnapshot,
  ChessMoveInput,
  ChessMoveRecord,
  ChessPlayerInGame,
  ChessRoomSummary,
  ChessVariant,
  GameMode,
  GameType,
  RankProgressionDelta,
  RoomChatMessage,
} from '@wordchain/shared';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket.js';
import { soundManager } from '../utils/sound.js';
import { useAuth } from './AuthContext.js';

const ACTIVE_CHESS_ROOM_KEY = 'chess_active_room';

interface ChessQueueStatus {
  inQueue: boolean;
  mode?: GameMode;
  chessVariant?: ChessVariant;
  position?: number;
  estimatedWaitSec?: number;
}

interface ChessMatchFoundInfo {
  roomId: string;
  mode: GameMode;
  chessVariant?: ChessVariant;
  countdownSec: number;
}

interface ChessMatchEndedState {
  winnerId: string;
  isDraw?: boolean;
  drawReason?: ChessEndReason;
  standings: ChessPlayerInGame[];
  deltas?: Record<string, RankProgressionDelta>;
}

interface ChessGameContextType {
  chessRoom: ChessRoomSummary | null;
  queueStatus: ChessQueueStatus | null;
  matchFound: ChessMatchFoundInfo | null;
  lastMove: ChessMoveRecord | null;
  moveError: string | null;
  matchWinner: ChessMatchEndedState | null;
  chatMessages: RoomChatMessage[];
  isConnected: boolean;
  error: string | null;
  joinQueue: (mode?: GameMode, variant?: ChessVariant, clockSec?: number) => void;
  leaveQueue: () => void;
  createPrivateRoom: (variant?: ChessVariant, clockSec?: number, incrementSec?: number) => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  toggleReady: (isReady: boolean) => void;
  addGuestPlayer: () => void;
  startMatch: () => void;
  kickPlayer: (targetUserId: string) => void;
  sendChatMessage: (text: string) => void;
  makeMove: (move: ChessMoveInput) => void;
  resignMatch: () => void;
  resetRematch: () => void;
  clearError: () => void;
}

const ChessGameContext = createContext<ChessGameContextType | null>(null);

export const ChessGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [chessRoom, setChessRoom] = useState<ChessRoomSummary | null>(null);
  const chessRoomRef = useRef<ChessRoomSummary | null>(null);
  const [queueStatus, setQueueStatus] = useState<ChessQueueStatus | null>(null);
  const [matchFound, setMatchFound] = useState<ChessMatchFoundInfo | null>(null);
  const [lastMove, setLastMove] = useState<ChessMoveRecord | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<ChessMatchEndedState | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const setChessRoomSafe = useCallback((summary: ChessRoomSummary | null) => {
    chessRoomRef.current = summary;
    setChessRoom(summary);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChessRoomSafe(null);
      setQueueStatus(null);
      setMatchFound(null);
      setLastMove(null);
      setMoveError(null);
      setMatchWinner(null);
      setChatMessages([]);
      return;
    }

    const socket = socketService.connect();

    const handleConnect = () => {
      setIsConnected(true);
      try {
        const savedRoomId = localStorage.getItem(ACTIVE_CHESS_ROOM_KEY);
        if (savedRoomId) {
          socketService.reconnect(savedRoomId);
        }
      } catch {
        // ignore
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleQueueStatus = (status: {
      inQueue: boolean;
      gameType?: GameType;
      mode?: GameMode;
      chessVariant?: ChessVariant;
      position?: number;
      estimatedWaitSec?: number;
    }) => {
      if (!status.inQueue) {
        setQueueStatus(null);
        return;
      }
      if (status.gameType !== 'CHESS') return;
      setQueueStatus({
        inQueue: true,
        mode: status.mode,
        chessVariant: status.chessVariant,
        position: status.position,
        estimatedWaitSec: status.estimatedWaitSec,
      });
    };

    const handleMatchFound = (info: {
      roomId: string;
      gameType?: GameType;
      mode: GameMode;
      chessVariant?: ChessVariant;
      countdownSec: number;
    }) => {
      if (info.gameType !== 'CHESS') return;
      soundManager.playVictory();
      setQueueStatus(null);
      setMatchFound({
        roomId: info.roomId,
        mode: info.mode,
        chessVariant: info.chessVariant,
        countdownSec: info.countdownSec,
      });
      setTimeout(() => setMatchFound(null), info.countdownSec * 1000);
    };

    const handleRoomUpdate = (summary: ChessRoomSummary | null) => {
      setChessRoomSafe(summary);
      if (!summary) {
        setLastMove(null);
        setMoveError(null);
        setMatchWinner(null);
        setChatMessages([]);
        try {
          localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
        } catch {
          // ignore
        }
        return;
      }

      if (summary.chatHistory) {
        setChatMessages(summary.chatHistory);
      }

      if (summary.status === 'IN_PROGRESS') {
        try {
          localStorage.setItem(ACTIVE_CHESS_ROOM_KEY, summary.roomId);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
        } catch {
          // ignore
        }
      }

      if (summary.status !== 'FINISHED') {
        setMatchWinner(null);
      }
    };

    const handleMoveApplied = (payload: {
      move: ChessMoveRecord;
      gameState: ChessGameStateSnapshot;
      turnStartedAtUtc: number;
      players: ChessPlayerInGame[];
    }) => {
      setMoveError(null);
      setLastMove(payload.move);
      if (payload.gameState.inCheckSeats.length > 0) {
        soundManager.playTimerUrgent();
      } else if (payload.move.captured) {
        soundManager.playWordAccepted();
      } else {
        soundManager.playTurnStart();
      }
      setChessRoom((prev) =>
        prev
          ? {
              ...prev,
              turnStartedAtUtc: payload.turnStartedAtUtc,
              players: payload.players,
              gameState: payload.gameState,
            }
          : prev
      );
    };

    const handleMoveRejected = (payload: { reason: string; message: string }) => {
      setMoveError(payload.message);
      soundManager.playMathWrong();
      window.setTimeout(() => setMoveError(null), 2600);
    };

    const handlePlayerEliminated = () => {
      soundManager.playEliminated();
    };

    const handleMatchEnded = (payload: {
      winnerId: string;
      isDraw?: boolean;
      drawReason?: ChessEndReason;
      standings: ChessPlayerInGame[];
      deltas: Record<string, RankProgressionDelta>;
    }) => {
      soundManager.playVictory();
      setMatchWinner(payload);
      try {
        localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
      } catch {
        // ignore
      }
      refreshUser().catch(() => {});
    };

    const handleRoomKicked = (payload: { reason?: string }) => {
      setChessRoomSafe(null);
      setLastMove(null);
      setMatchWinner(null);
      setChatMessages([]);
      setError(payload.reason || 'You were removed from the room by the host.');
      try {
        localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
      } catch {
        // ignore
      }
    };

    const handleChatMessage = (msg: RoomChatMessage) => {
      if (chessRoomRef.current && msg.roomId === chessRoomRef.current.roomId) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev.slice(-49), msg];
        });
      }
    };

    const handleSocketError = (payload: { code: string; message: string }) => {
      if (payload.code === 'RECONNECT_FAILED') {
        try {
          localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
        } catch {
          // ignore
        }
        return;
      }
      setError(payload.message);
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = window.setTimeout(() => setError(null), 4000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('QUEUE_STATUS', handleQueueStatus);
    socket.on('MATCH_FOUND', handleMatchFound);
    socket.on('CHESS_ROOM_STATE_UPDATE', handleRoomUpdate);
    socket.on('CHESS_MOVE_APPLIED', handleMoveApplied);
    socket.on('CHESS_MOVE_REJECTED', handleMoveRejected);
    socket.on('CHESS_PLAYER_ELIMINATED', handlePlayerEliminated);
    socket.on('CHESS_MATCH_ENDED', handleMatchEnded);
    socket.on('ROOM_KICKED', handleRoomKicked);
    socket.on('ROOM_CHAT_MESSAGE', handleChatMessage);
    socket.on('SOCKET_ERROR', handleSocketError);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('QUEUE_STATUS', handleQueueStatus);
      socket.off('MATCH_FOUND', handleMatchFound);
      socket.off('CHESS_ROOM_STATE_UPDATE', handleRoomUpdate);
      socket.off('CHESS_MOVE_APPLIED', handleMoveApplied);
      socket.off('CHESS_MOVE_REJECTED', handleMoveRejected);
      socket.off('CHESS_PLAYER_ELIMINATED', handlePlayerEliminated);
      socket.off('CHESS_MATCH_ENDED', handleMatchEnded);
      socket.off('ROOM_KICKED', handleRoomKicked);
      socket.off('ROOM_CHAT_MESSAGE', handleChatMessage);
      socket.off('SOCKET_ERROR', handleSocketError);
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [user?.id, authLoading, refreshUser, setChessRoomSafe]);

  const joinQueue = useCallback(
    (
      mode: GameMode = 'CASUAL',
      variant: ChessVariant = '2P',
      clockSec: number = CHESS_DEFAULT_CLOCK_SEC
    ) => {
      setError(null);
      socketService.joinChessQueue(mode, variant, clockSec);
    },
    []
  );

  const leaveQueue = useCallback(() => {
    socketService.leaveQueue();
    setQueueStatus(null);
  }, []);

  const createPrivateRoom = useCallback(
    (
      variant: ChessVariant = '2P',
      clockSec: number = CHESS_DEFAULT_CLOCK_SEC,
      incrementSec: number = CHESS_DEFAULT_INCREMENT_SEC
    ) => {
      setError(null);
      socketService.createChessPrivateRoom(variant, clockSec, incrementSec);
    },
    []
  );

  const joinRoom = useCallback((code: string) => {
    setError(null);
    socketService.joinRoom(code);
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.leaveRoom();
    setChessRoomSafe(null);
    setLastMove(null);
    setMoveError(null);
    setMatchWinner(null);
    setChatMessages([]);
    try {
      localStorage.removeItem(ACTIVE_CHESS_ROOM_KEY);
    } catch {
      // ignore
    }
  }, [setChessRoomSafe]);

  const toggleReady = useCallback((isReady: boolean) => {
    socketService.toggleReady(isReady);
  }, []);

  const addGuestPlayer = useCallback(() => {
    socketService.addGuestPlayer();
  }, []);

  const startMatch = useCallback(() => {
    socketService.startMatch();
  }, []);

  const kickPlayer = useCallback((targetUserId: string) => {
    socketService.kickPlayer(targetUserId);
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    socketService.sendChatMessage(text);
  }, []);

  const makeMove = useCallback((move: ChessMoveInput) => {
    setMoveError(null);
    socketService.sendChessMove(move.from, move.to, move.promotion);
  }, []);

  const resignMatch = useCallback(() => {
    socketService.resignChess();
  }, []);

  const resetRematch = useCallback(() => {
    socketService.resetRematch();
    setMatchWinner(null);
    setLastMove(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <ChessGameContext.Provider
      value={{
        chessRoom,
        queueStatus,
        matchFound,
        lastMove,
        moveError,
        matchWinner,
        chatMessages,
        isConnected,
        error,
        joinQueue,
        leaveQueue,
        createPrivateRoom,
        joinRoom,
        leaveRoom,
        toggleReady,
        addGuestPlayer,
        startMatch,
        kickPlayer,
        sendChatMessage,
        makeMove,
        resignMatch,
        resetRematch,
        clearError,
      }}
    >
      {children}
    </ChessGameContext.Provider>
  );
};

export const useChessGame = (): ChessGameContextType => {
  const ctx = useContext(ChessGameContext);
  if (!ctx) {
    throw new Error('useChessGame must be used inside a ChessGameProvider');
  }
  return ctx;
};
