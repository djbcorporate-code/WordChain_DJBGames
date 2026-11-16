import {
  GameMode,
  GameType,
  ImpostorPlayerInGame,
  ImpostorResolvedCategory,
  ImpostorRoomSummary,
  ImpostorSettings,
  ImpostorWinnerFaction,
  RoomChatMessage,
} from '@wordchain/shared';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket.js';
import { soundManager } from '../utils/sound.js';
import { useAuth } from './AuthContext.js';

export interface ImpostorQueueState {
  inQueue: boolean;
  mode?: GameMode;
  position?: number;
  estimatedWaitSec?: number;
}

export interface ImpostorMatchEndedPayload {
  winnerFaction: ImpostorWinnerFaction;
  secretWord: string;
  impostorHint: string;
  resolvedCategory: ImpostorResolvedCategory;
  players: ImpostorPlayerInGame[];
}

interface ImpostorGameContextType {
  impostorRoom: ImpostorRoomSummary | null;
  queueStatus: ImpostorQueueState | null;
  matchFoundNotice: { roomId: string; countdownSec: number } | null;
  countdownRemaining: number | null;
  matchEnded: ImpostorMatchEndedPayload | null;
  lastError: string | null;
  kickedNotice: string | null;
  joinCasualQueue: () => void;
  leaveQueue: () => void;
  createPrivateRoom: (settings?: Partial<ImpostorSettings>) => void;
  joinRoomByCode: (roomCode: string) => void;
  leaveRoom: () => void;
  toggleReady: (isReady: boolean) => void;
  startMatch: () => void;
  kickPlayer: (targetUserId: string) => void;
  sendChatMessage: (text: string) => void;
  updateSettings: (patch: Partial<ImpostorSettings>) => void;
  setReadyToVote: (ready: boolean) => void;
  castVote: (targetUserId: string | 'SKIP') => void;
  resetRematch: () => void;
  dismissMatchEnded: () => void;
  dismissKickedNotice: () => void;
  clearError: () => void;
}

const ImpostorGameContext = createContext<ImpostorGameContextType | null>(null);

export const ImpostorGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [impostorRoom, setImpostorRoom] = useState<ImpostorRoomSummary | null>(null);
  const [queueStatus, setQueueStatus] = useState<ImpostorQueueState | null>(null);
  const [matchFoundNotice, setMatchFoundNotice] = useState<{ roomId: string; countdownSec: number } | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [matchEnded, setMatchEnded] = useState<ImpostorMatchEndedPayload | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);

  const prevPhaseRef = useRef<string | undefined>(undefined);

  const setImpostorRoomSafe = useCallback((summary: ImpostorRoomSummary | null) => {
    setImpostorRoom(summary);
    if (!summary) {
      prevPhaseRef.current = undefined;
      setMatchEnded(null);
      setCountdownRemaining(null);
      return;
    }

    const prevPhase = prevPhaseRef.current;
    if (prevPhase !== summary.phase && summary.phase) {
      prevPhaseRef.current = summary.phase;
      if (summary.phase === 'ROLE_REVEAL') {
        soundManager.playTurnStart();
      } else if (summary.phase === 'VOTING') {
        soundManager.playTimerUrgent();
      } else if (summary.phase === 'EJECTION') {
        if (summary.lastEjection?.outcome === 'EJECTED') {
          soundManager.playEliminated();
        } else {
          soundManager.playPickConfirm();
        }
      }
    } else if (!summary.phase) {
      prevPhaseRef.current = undefined;
    }

    if (summary.status === 'IN_PROGRESS') {
      setCountdownRemaining(null);
      setMatchEnded(null);
      try {
        localStorage.setItem('wordchain_active_room', summary.roomId);
      } catch {
        // ignore
      }
    } else if (summary.status === 'WAITING') {
      setMatchEnded(null);
      setCountdownRemaining(null);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setImpostorRoomSafe(null);
      setQueueStatus(null);
      setMatchFoundNotice(null);
      return;
    }
    const socket = socketService.connect();

    const handleQueueStatus = (status: {
      inQueue: boolean;
      gameType?: GameType;
      mode?: GameMode;
      position?: number;
      estimatedWaitSec?: number;
    }) => {
      if (!status.inQueue) {
        setQueueStatus(null);
        return;
      }
      if (status.gameType !== 'IMPOSTOR') return;
      setQueueStatus({
        inQueue: true,
        mode: status.mode,
        position: status.position,
        estimatedWaitSec: status.estimatedWaitSec,
      });
    };

    const handleMatchFound = (info: {
      roomId: string;
      gameType?: GameType;
      mode: GameMode;
      countdownSec: number;
    }) => {
      if (info.gameType !== 'IMPOSTOR') return;
      soundManager.playVictory();
      setQueueStatus(null);
      setMatchFoundNotice({
        roomId: info.roomId,
        countdownSec: info.countdownSec,
      });
      setTimeout(() => setMatchFoundNotice(null), (info.countdownSec || 3) * 1000 + 250);
    };

    const handleRoomUpdate = (summary: ImpostorRoomSummary | null) => {
      setImpostorRoomSafe(summary);
    };

    const handleCountdownTick = ({ remainingSec }: { remainingSec: number }) => {
      setImpostorRoom((curr) => {
        if (curr) {
          setCountdownRemaining(remainingSec);
        }
        return curr;
      });
    };

    const handleMatchEnded = (payload: ImpostorMatchEndedPayload) => {
      setMatchEnded(payload);
      soundManager.playVictory();
      try {
        localStorage.removeItem('wordchain_active_room');
      } catch {
        // ignore
      }
    };

    const handleChatMessage = (msg: RoomChatMessage) => {
      setImpostorRoom((prev) => {
        if (!prev || prev.roomId !== msg.roomId) return prev;
        const existing = prev.chatHistory || [];
        if (existing.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chatHistory: [...existing, msg].slice(-100),
        };
      });
    };

    const handleKicked = ({ reason }: { reason?: string }) => {
      setImpostorRoomSafe(null);
      setKickedNotice(reason || 'You were removed from the classified room by the Host.');
    };

    const handleSocketError = (err: { code: string; message: string }) => {
      if (
        err.code === 'SETTINGS_REJECTED' ||
        err.code === 'VOTE_REJECTED' ||
        err.code === 'EJECTED_SILENCED' ||
        err.code === 'BOTS_NOT_ALLOWED' ||
        err.code === 'RANKED_NOT_SUPPORTED' ||
        err.code === 'NOT_ENOUGH_PLAYERS' ||
        err.code === 'PLAYERS_NOT_READY'
      ) {
        setLastError(err.message);
        soundManager.playWordRejected();
        setTimeout(() => setLastError(null), 4000);
      }
    };

    socket.on('QUEUE_STATUS', handleQueueStatus);
    socket.on('MATCH_FOUND', handleMatchFound);
    socket.on('IMPOSTOR_ROOM_STATE_UPDATE', handleRoomUpdate);
    socket.on('ROOM_COUNTDOWN_TICK', handleCountdownTick);
    socket.on('IMPOSTOR_MATCH_ENDED', handleMatchEnded);
    socket.on('ROOM_CHAT_MESSAGE', handleChatMessage);
    socket.on('ROOM_KICKED', handleKicked);
    socket.on('SOCKET_ERROR', handleSocketError);

    return () => {
      socket.off('QUEUE_STATUS', handleQueueStatus);
      socket.off('MATCH_FOUND', handleMatchFound);
      socket.off('IMPOSTOR_ROOM_STATE_UPDATE', handleRoomUpdate);
      socket.off('ROOM_COUNTDOWN_TICK', handleCountdownTick);
      socket.off('IMPOSTOR_MATCH_ENDED', handleMatchEnded);
      socket.off('ROOM_CHAT_MESSAGE', handleChatMessage);
      socket.off('ROOM_KICKED', handleKicked);
      socket.off('SOCKET_ERROR', handleSocketError);
    };
  }, [authLoading, user, setImpostorRoomSafe]);

  const joinCasualQueue = useCallback(() => {
    setLastError(null);
    socketService.joinImpostorCasualQueue();
  }, []);

  const leaveQueue = useCallback(() => {
    socketService.leaveQueue();
    setQueueStatus(null);
  }, []);

  const createPrivateRoom = useCallback((settings?: Partial<ImpostorSettings>) => {
    setLastError(null);
    socketService.createImpostorPrivateRoom(settings);
  }, []);

  const joinRoomByCode = useCallback((roomCode: string) => {
    setLastError(null);
    socketService.joinRoom(roomCode);
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.leaveRoom();
    setImpostorRoomSafe(null);
    try {
      localStorage.removeItem('wordchain_active_room');
    } catch {
      // ignore
    }
  }, [setImpostorRoomSafe]);

  const toggleReady = useCallback((isReady: boolean) => {
    socketService.toggleReady(isReady);
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

  const updateSettings = useCallback((patch: Partial<ImpostorSettings>) => {
    socketService.updateImpostorSettings(patch);
  }, []);

  const setReadyToVote = useCallback((ready: boolean) => {
    socketService.readyToVoteImpostor(ready);
    soundManager.playPickConfirm();
  }, []);

  const castVote = useCallback((targetUserId: string | 'SKIP') => {
    socketService.castImpostorVote(targetUserId);
    soundManager.playPickConfirm();
  }, []);

  const resetRematch = useCallback(() => {
    setMatchEnded(null);
    socketService.resetRematch();
  }, []);

  return (
    <ImpostorGameContext.Provider
      value={{
        impostorRoom,
        queueStatus,
        matchFoundNotice,
        countdownRemaining,
        matchEnded,
        lastError,
        kickedNotice,
        joinCasualQueue,
        leaveQueue,
        createPrivateRoom,
        joinRoomByCode,
        leaveRoom,
        toggleReady,
        startMatch,
        kickPlayer,
        sendChatMessage,
        updateSettings,
        setReadyToVote,
        castVote,
        resetRematch,
        dismissMatchEnded: () => setMatchEnded(null),
        dismissKickedNotice: () => setKickedNotice(null),
        clearError: () => setLastError(null),
      }}
    >
      {children}
    </ImpostorGameContext.Provider>
  );
};

export function useImpostorGame(): ImpostorGameContextType {
  const ctx = useContext(ImpostorGameContext);
  if (!ctx) throw new Error('useImpostorGame must be used inside ImpostorGameProvider');
  return ctx;
}
