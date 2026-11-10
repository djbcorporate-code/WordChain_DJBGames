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
    peerTyping,
    matchWinner,
    leaveRoom,
    submitWord,
    sendTypingUpdate,
    resetRematch,
  } = useGame();

  const activeTurn = turnState || currentRoom?.turnState || null;
  const totalDurationMs = (activeTurn?.turnDurationSec || 15) * 1000;
  const isMyTurn = activeTurn?.activeUserId === user?.id;

  const [remainingMs, setRemainingMs] = useState<number>(totalDurationMs);

  // Sync high-precision countdown ticker to authoritative turnDeadlineUtc with clock skew compensation
  useEffect(() => {
    if (!activeTurn) return;

    const durationMs = (activeTurn.turnDurationSec || 15) * 1000;
    const clientReceiveTime = Date.now();
    // Compensate for clock skew between client computer and authoritative game server
    const clockOffset = activeTurn.serverNowUtc ? (activeTurn.serverNowUtc - clientReceiveTime) : 0;

    const tick = () => {
      const estimatedServerNow = Date.now() + clockOffset;
      const left = Math.max(0, Math.min(durationMs, activeTurn.turnDeadlineUtc - estimatedServerNow));
      setRemainingMs(left);
    };

    tick();
    const interval = setInterval(tick, 50);

    return () => clearInterval(interval);
  }, [activeTurn]);

  if (!currentRoom) return null;

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
        peerTypingSuffix={peerTyping && peerTyping.userId === turnState?.activeUserId ? peerTyping.inputSuffix : ''}
        onSubmitWord={submitWord}
        onTypingUpdate={sendTypingUpdate}
        lastRejectionReason={lastRejectionReason}
        shakeTrigger={shakeTrigger}
        onLeaveMatch={leaveRoom}
      />

      {matchWinner && (
        <PostMatchModal
          winnerId={matchWinner.winnerId}
          standings={matchWinner.standings}
          deltas={matchWinner.deltas}
          mode={currentRoom.mode}
          isHost={currentRoom.hostUserId === user?.id}
          onRematch={resetRematch}
          onClose={leaveRoom}
        />
      )}
    </>
  );
};
