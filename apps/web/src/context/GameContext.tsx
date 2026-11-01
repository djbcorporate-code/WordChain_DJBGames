import {
  GameRoomSummary,
  GameTurnState,
  PlayerInGame,
  WordRejectionReason,
} from '@wordchain/shared';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket.js';
import { soundManager } from '../utils/sound.js';
import { useAuth } from './AuthContext.js';

interface GameContextType {
  currentRoom: GameRoomSummary | null;
  turnState: GameTurnState | null;
  lastRejectionReason: string | null;
  shakeTrigger: number;
  matchWinner: { winnerId: string; standings: PlayerInGame[] } | null;
  error: string | null;
  isConnected: boolean;
  createPrivateRoom: (timerSec?: number) => void;
  joinRoomByCode: (code: string) => void;
  leaveRoom: () => void;
  toggleReady: (isReady: boolean) => void;
  startMatch: () => void;
  submitWord: (word: string) => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<GameRoomSummary | null>(null);
  const [turnState, setTurnState] = useState<GameTurnState | null>(null);
  const [lastRejectionReason, setLastRejectionReason] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState<number>(0);
  const [matchWinner, setMatchWinner] = useState<{ winnerId: string; standings: PlayerInGame[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      setCurrentRoom(null);
      setIsConnected(false);
      return;
    }

    const socket = socketService.connect();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleRoomUpdate = (summary: GameRoomSummary) => {
      setCurrentRoom(summary);
      if (summary.turnState) {
        setTurnState(summary.turnState);
      }
    };

    const handleTurnStart = (newTurnState: GameTurnState) => {
      setTurnState(newTurnState);
      setLastRejectionReason(null);
      if (newTurnState.activeUserId === user.id) {
        soundManager.playTurnStart();
      }
    };

    const handleWordAccepted = () => {
      soundManager.playWordAccepted();
      setLastRejectionReason(null);
    };

    const handleWordRejected = (payload: { word: string; reason: WordRejectionReason; message: string }) => {
      soundManager.playWordRejected();
      setLastRejectionReason(payload.message);
      setShakeTrigger((s) => s + 1);
    };

    const handlePlayerEliminated = () => {
      soundManager.playEliminated();
    };

    const handleMatchEnded = (payload: { winnerId: string; standings: PlayerInGame[] }) => {
      soundManager.playVictory();
      setMatchWinner({ winnerId: payload.winnerId, standings: payload.standings });
    };

    const handleSocketError = (payload: { code: string; message: string }) => {
      setError(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ROOM_STATE_UPDATE', handleRoomUpdate);
    socket.on('GAME_TURN_START', handleTurnStart);
    socket.on('GAME_WORD_ACCEPTED', handleWordAccepted);
    socket.on('GAME_WORD_REJECTED', handleWordRejected);
    socket.on('GAME_PLAYER_ELIMINATED', handlePlayerEliminated);
    socket.on('GAME_MATCH_ENDED', handleMatchEnded);
    socket.on('SOCKET_ERROR', handleSocketError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ROOM_STATE_UPDATE', handleRoomUpdate);
      socket.off('GAME_TURN_START', handleTurnStart);
      socket.off('GAME_WORD_ACCEPTED', handleWordAccepted);
      socket.off('GAME_WORD_REJECTED', handleWordRejected);
      socket.off('GAME_PLAYER_ELIMINATED', handlePlayerEliminated);
      socket.off('GAME_MATCH_ENDED', handleMatchEnded);
      socket.off('SOCKET_ERROR', handleSocketError);
    };
  }, [user]);

  const createPrivateRoom = (timerSec: number = 15) => {
    setError(null);
    setMatchWinner(null);
    socketService.createPrivateRoom(timerSec);
  };

  const joinRoomByCode = (code: string) => {
    setError(null);
    setMatchWinner(null);
    socketService.joinRoom(code);
  };

  const leaveRoom = () => {
    socketService.leaveRoom();
    setCurrentRoom(null);
    setTurnState(null);
    setMatchWinner(null);
  };

  const toggleReady = (isReady: boolean) => {
    socketService.toggleReady(isReady);
  };

  const startMatch = () => {
    socketService.startMatch();
  };

  const submitWord = (word: string) => {
    socketService.submitWord(word);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <GameContext.Provider
      value={{
        currentRoom,
        turnState,
        lastRejectionReason,
        shakeTrigger,
        matchWinner,
        error,
        isConnected,
        createPrivateRoom,
        joinRoomByCode,
        leaveRoom,
        toggleReady,
        startMatch,
        submitWord,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
