import React, { useEffect, useState } from 'react';
import { ArenaHUD } from '../components/game/ArenaHUD.js';
import { PostMatchModal } from '../components/game/PostMatchModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useGame } from '../context/GameContext.js';

export const LiveMultiplayerArena: React.FC = () => {
  const { user } = useAuth();
  const {
    currentRoom,
    turnState,
    lastRejectionReason,
    shakeTrigger,
    matchWinner,
    leaveRoom,
    submitWord,
  } = useGame();

  const [remainingMs, setRemainingMs] = useState<number>(15000);

  // Sync high-precision countdown ticker to authoritative turnDeadlineUtc
  useEffect(() => {
    if (!turnState) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, turnState.turnDeadlineUtc - now);
      setRemainingMs(left);
    }, 50);

    return () => clearInterval(interval);
  }, [turnState]);

  if (!currentRoom) return null;

  const totalDurationMs = (turnState?.turnDurationSec || 15) * 1000;
  const isMyTurn = turnState?.activeUserId === user?.id;

  return (
    <>
      <ArenaHUD
        mode={currentRoom.mode}
        roundNumber={turnState?.roundNumber || currentRoom.turnState?.roundNumber || 1}
        currentWord={currentRoom.currentWord}
        requiredLetter={currentRoom.requiredLetter}
        wordHistory={currentRoom.historyWords}
        players={currentRoom.players}
        activeUserId={turnState?.activeUserId || ''}
        myUserId={user?.id || ''}
        remainingMs={remainingMs}
        totalDurationMs={totalDurationMs}
        isMyTurn={isMyTurn}
        onSubmitWord={submitWord}
        lastRejectionReason={lastRejectionReason}
        shakeTrigger={shakeTrigger}
        onLeaveMatch={leaveRoom}
      />

      {matchWinner && (
        <PostMatchModal
          winnerId={matchWinner.winnerId}
          standings={matchWinner.standings}
          onClose={leaveRoom}
        />
      )}
    </>
  );
};
