import {
  GameMode,
  MathOperationMode,
  MathPlayerInGame,
  MathRoomSummary,
  MathRoundResultPayload,
  RankProgressionDelta,
  RoomChatMessage,
} from '@wordchain/shared';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket.js';
import { soundManager } from '../utils/sound.js';
import { useAuth } from './AuthContext.js';

const ACTIVE_MATH_ROOM_KEY = 'mathblitz_active_room';

interface MathQueueStatus {
  inQueue: boolean;
  mode?: GameMode;
  operationMode?: MathOperationMode;
  position?: number;
  estimatedWaitSec?: number;
}

interface MathMatchFoundInfo {
  roomId: string;
  mode: GameMode;
  operationMode?: MathOperationMode;
  countdownSec: number;
}

interface MathSolveFeedItem {
  userId: string;
  username: string;
  placement: number;
  pointsEarned: number;
  solveTimeMs: number;
}

interface MathGameContextType {
  mathRoom: MathRoomSummary | null;
  queueStatus: MathQueueStatus | null;
  matchFound: MathMatchFoundInfo | null;
  roundResult: MathRoundResultPayload | null;
  recentSolves: MathSolveFeedItem[];
  answerError: { message: string; lockedOut: boolean; ts: number } | null;
  matchWinner: {
    winnerId: string;
    standings: MathPlayerInGame[];
    deltas?: Record<string, RankProgressionDelta>;
  } | null;
  chatMessages: RoomChatMessage[];
  isConnected: boolean;
  error: string | null;
  joinQueue: (mode?: GameMode, operationMode?: MathOperationMode) => void;
  leaveQueue: () => void;
  createPrivateRoom: (operationMode?: MathOperationMode, customTimerSec?: number) => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  toggleReady: (isReady: boolean) => void;
  addGuestPlayer: () => void;
  startMatch: () => void;
  kickPlayer: (targetUserId: string) => void;
  sendChatMessage: (text: string) => void;
  submitPick: (number: number) => void;
  submitAnswer: (answer: string) => void;
  resetRematch: () => void;
  clearError: () => void;
  clearAnswerError: () => void;
  clearMatchWinner: () => void;
}

const MathGameContext = createContext<MathGameContextType | undefined>(undefined);

export const MathGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [mathRoom, setMathRoom] = useState<MathRoomSummary | null>(null);
  const mathRoomRef = useRef<MathRoomSummary | null>(null);

  const [queueStatus, setQueueStatus] = useState<MathQueueStatus | null>(null);
  const [matchFound, setMatchFound] = useState<MathMatchFoundInfo | null>(null);
  const [roundResult, setRoundResult] = useState<MathRoundResultPayload | null>(null);
  const [recentSolves, setRecentSolves] = useState<MathSolveFeedItem[]>([]);
  const [answerError, setAnswerError] = useState<{ message: string; lockedOut: boolean; ts: number } | null>(null);
  const [matchWinner, setMatchWinner] = useState<{
    winnerId: string;
    standings: MathPlayerInGame[];
    deltas?: Record<string, RankProgressionDelta>;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorTimeoutRef = useRef<number | null>(null);

  const setMathRoomSafe = useCallback((room: MathRoomSummary | null) => {
    mathRoomRef.current = room;
    setMathRoom(room);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMathRoomSafe(null);
      setQueueStatus(null);
      setMatchFound(null);
      setRoundResult(null);
      setRecentSolves([]);
      setMatchWinner(null);
      setChatMessages([]);
      setIsConnected(false);
      return;
    }

    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const handleConnect = () => {
      setIsConnected(true);
      try {
        const savedRoomId = localStorage.getItem(ACTIVE_MATH_ROOM_KEY);
        if (savedRoomId) {
          socketService.reconnect(savedRoomId);
        }
      } catch {
        // ignore storage errors
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleQueueStatus = (status: {
      inQueue: boolean;
      gameType?: 'WORDCHAIN' | 'MATHRACE';
      mode?: GameMode;
      operationMode?: MathOperationMode;
      position?: number;
      estimatedWaitSec?: number;
    }) => {
      if (!status.inQueue) {
        setQueueStatus(null);
        return;
      }
      if (status.gameType !== 'MATHRACE') return;

      setQueueStatus({
        inQueue: true,
        mode: status.mode,
        operationMode: status.operationMode,
        position: status.position,
        estimatedWaitSec: status.estimatedWaitSec,
      });
    };

    const handleMatchFound = (info: {
      roomId: string;
      gameType?: 'WORDCHAIN' | 'MATHRACE';
      mode: GameMode;
      operationMode?: MathOperationMode;
      countdownSec: number;
    }) => {
      if (info.gameType !== 'MATHRACE') return;
      soundManager.playVictory();
      setQueueStatus(null);
      setMatchFound({
        roomId: info.roomId,
        mode: info.mode,
        operationMode: info.operationMode,
        countdownSec: info.countdownSec,
      });
      setTimeout(() => setMatchFound(null), info.countdownSec * 1000);
    };

    const handleRoomUpdate = (summary: MathRoomSummary | null) => {
      setMathRoomSafe(summary);
      if (!summary) {
        setRoundResult(null);
        setRecentSolves([]);
        setAnswerError(null);
        setMatchWinner(null);
        setChatMessages([]);
        try {
          localStorage.removeItem(ACTIVE_MATH_ROOM_KEY);
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
          localStorage.setItem(ACTIVE_MATH_ROOM_KEY, summary.roomId);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem(ACTIVE_MATH_ROOM_KEY);
        } catch {
          // ignore
        }
      }

      if (summary.status !== 'FINISHED') {
        setMatchWinner(null);
      }
      if (summary.roundState?.phase === 'PICKING') {
        setRoundResult(null);
        setAnswerError(null);
      }
    };

    const handlePickStart = () => {
      soundManager.playYourTurn();
      setRoundResult(null);
      setRecentSolves([]);
      setAnswerError(null);
    };

    const handleRaceStart = () => {
      soundManager.playTurnStart();
      setRecentSolves([]);
      setAnswerError(null);
    };

    const handlePlayerSolved = (payload: {
      userId: string;
      username: string;
      placement: number;
      pointsEarned: number;
      totalScore: number;
      solveTimeMs: number;
    }) => {
      if (payload.userId === user.id) {
        soundManager.playMathCorrect();
        setAnswerError(null);
      }
      setRecentSolves((prev) => {
        if (prev.some((item) => item.userId === payload.userId)) return prev;
        return [
          ...prev,
          {
            userId: payload.userId,
            username: payload.username,
            placement: payload.placement,
            pointsEarned: payload.pointsEarned,
            solveTimeMs: payload.solveTimeMs,
          },
        ];
      });
    };

    const handleAnswerRejected = (payload: {
      reason: string;
      message: string;
      lockedOut: boolean;
    }) => {
      soundManager.playMathWrong();
      setAnswerError({
        message: payload.message,
        lockedOut: payload.lockedOut,
        ts: Date.now(),
      });
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
      if (!payload.lockedOut) {
        errorTimeoutRef.current = window.setTimeout(() => {
          setAnswerError(null);
        }, 2500);
      }
    };

    const handleRoundEnded = (payload: MathRoundResultPayload) => {
      setRoundResult(payload);
    };

    const handleMatchEnded = (payload: {
      winnerId: string;
      standings: MathPlayerInGame[];
      deltas?: Record<string, RankProgressionDelta>;
    }) => {
      soundManager.playVictory();
      setMatchWinner({
        winnerId: payload.winnerId,
        standings: payload.standings,
        deltas: payload.deltas,
      });
      refreshUser().catch(() => {});
      try {
        localStorage.removeItem(ACTIVE_MATH_ROOM_KEY);
      } catch {
        // ignore
      }
    };

    const handleRoomKicked = (payload: { reason?: string }) => {
      if (!mathRoomRef.current) return;
      soundManager.playMathWrong();
      setError(payload.reason || 'You were kicked from the room by the host.');
      setMathRoomSafe(null);
      setRoundResult(null);
      setRecentSolves([]);
      setChatMessages([]);
      try {
        localStorage.removeItem(ACTIVE_MATH_ROOM_KEY);
      } catch {
        // ignore
      }
    };

    const handleChatMessage = (msg: RoomChatMessage) => {
      if (!mathRoomRef.current || msg.roomId !== mathRoomRef.current.roomId) return;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleSocketError = (payload: { code: string; message: string }) => {
      setError(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('QUEUE_STATUS', handleQueueStatus);
    socket.on('MATCH_FOUND', handleMatchFound);
    socket.on('MATH_ROOM_STATE_UPDATE', handleRoomUpdate);
    socket.on('MATH_ROUND_PICK_START', handlePickStart);
    socket.on('MATH_ROUND_RACE_START', handleRaceStart);
    socket.on('MATH_PLAYER_SOLVED', handlePlayerSolved);
    socket.on('MATH_ANSWER_REJECTED', handleAnswerRejected);
    socket.on('MATH_ROUND_ENDED', handleRoundEnded);
    socket.on('MATH_MATCH_ENDED', handleMatchEnded);
    socket.on('ROOM_KICKED', handleRoomKicked);
    socket.on('ROOM_CHAT_MESSAGE', handleChatMessage);
    socket.on('SOCKET_ERROR', handleSocketError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('QUEUE_STATUS', handleQueueStatus);
      socket.off('MATCH_FOUND', handleMatchFound);
      socket.off('MATH_ROOM_STATE_UPDATE', handleRoomUpdate);
      socket.off('MATH_ROUND_PICK_START', handlePickStart);
      socket.off('MATH_ROUND_RACE_START', handleRaceStart);
      socket.off('MATH_PLAYER_SOLVED', handlePlayerSolved);
      socket.off('MATH_ANSWER_REJECTED', handleAnswerRejected);
      socket.off('MATH_ROUND_ENDED', handleRoundEnded);
      socket.off('MATH_MATCH_ENDED', handleMatchEnded);
      socket.off('ROOM_KICKED', handleRoomKicked);
      socket.off('ROOM_CHAT_MESSAGE', handleChatMessage);
      socket.off('SOCKET_ERROR', handleSocketError);
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [user?.id, authLoading, refreshUser, setMathRoomSafe]);

  const joinQueue = useCallback((mode: GameMode = 'CASUAL', operationMode: MathOperationMode = 'MIXED') => {
    setError(null);
    socketService.joinMathQueue(mode, operationMode);
  }, []);

  const leaveQueue = useCallback(() => {
    socketService.leaveQueue();
    setQueueStatus(null);
  }, []);

  const createPrivateRoom = useCallback((operationMode: MathOperationMode = 'MIXED', customTimerSec = 60) => {
    setError(null);
    socketService.createMathPrivateRoom(operationMode, customTimerSec);
  }, []);

  const joinRoom = useCallback((code: string) => {
    setError(null);
    socketService.joinRoom(code);
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.leaveRoom();
    setMathRoomSafe(null);
    setRoundResult(null);
    setRecentSolves([]);
    setAnswerError(null);
    setMatchWinner(null);
    setChatMessages([]);
    try {
      localStorage.removeItem(ACTIVE_MATH_ROOM_KEY);
    } catch {
      // ignore
    }
  }, [setMathRoomSafe]);

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

  const submitPick = useCallback((number: number) => {
    soundManager.playPickConfirm();
    socketService.submitMathPick(number);
  }, []);

  const submitAnswer = useCallback((answer: string) => {
    socketService.submitMathAnswer(answer);
  }, []);

  const resetRematch = useCallback(() => {
    socketService.resetRematch();
    setMatchWinner(null);
    setRoundResult(null);
    setRecentSolves([]);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearAnswerError = useCallback(() => setAnswerError(null), []);
  const clearMatchWinner = useCallback(() => setMatchWinner(null), []);

  return (
    <MathGameContext.Provider
      value={{
        mathRoom,
        queueStatus,
        matchFound,
        roundResult,
        recentSolves,
        answerError,
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
        submitPick,
        submitAnswer,
        resetRematch,
        clearError,
        clearAnswerError,
        clearMatchWinner,
      }}
    >
      {children}
    </MathGameContext.Provider>
  );
};

export function useMathGame(): MathGameContextType {
  const ctx = useContext(MathGameContext);
  if (!ctx) {
    throw new Error('useMathGame must be used within a MathGameProvider');
  }
  return ctx;
}
