import { PlayerInGame } from '@wordchain/shared';
import React, { useEffect, useRef, useState } from 'react';
import { ArenaHUD } from '../components/game/ArenaHUD.js';
import { useAuth } from '../context/AuthContext.js';
import { soundManager } from '../utils/sound.js';

interface PracticeArenaProps {
  onExit: () => void;
}

const INITIAL_BOTS: PlayerInGame[] = [
  {
    userId: 'bot-1',
    username: 'Hypatia_Bot',
    avatarId: 'avatar_02',
    tier: 'KINDER',
    division: 2,
    lives: 3,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  },
  {
    userId: 'bot-2',
    username: 'Aristotle_Bot',
    avatarId: 'avatar_03',
    tier: 'HIGH_SCHOOL',
    division: 1,
    lives: 3,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  },
  {
    userId: 'bot-3',
    username: 'Curie_Bot',
    avatarId: 'avatar_04',
    tier: 'DOCTORATE',
    division: 4,
    lives: 3,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  },
];

// Fallback dictionary for practice simulation (includes popular nouns, countries, and names)
const SAMPLE_DICTIONARY = new Set([
  'PLANET', 'TIGER', 'RABBIT', 'TURTLE', 'ELEPHANT', 'TRAIN', 'NEST', 'TREE',
  'EAGLE', 'ENERGY', 'YELLOW', 'WATER', 'RIVER', 'ROAD', 'DOLPHIN', 'NIGHT',
  'TIME', 'EARTH', 'HEART', 'TEMPLE', 'LEMON', 'NATURE', 'EVENING', 'GRAPE',
  'EMERALD', 'DRAGON', 'NEEDLE', 'EAST', 'TOAD', 'DEER', 'RAIN', 'NOVA',
  'APPLE', 'ENGINE', 'ESCAPE', 'ECLIPSE', 'SHIELD', 'DIAMOND', 'DREAM', 'MAGIC',
  'FRANCE', 'CANADA', 'BRAZIL', 'JAPAN', 'SPAIN', 'ITALY', 'EGYPT', 'GREECE',
  'EMMA', 'JOHN', 'ALEX', 'SARAH', 'NOAH', 'CHLOE', 'LUCAS', 'OLIVIA', 'LIAM',
]);

export const PracticeArena: React.FC<PracticeArenaProps> = ({ onExit }) => {
  const { user } = useAuth();

  const myUserId = user?.id || 'player-self';
  const myUsername = user?.username || 'You';
  const myTier = user?.currentRank.tier || 'NURSERY';
  const myDivision = user?.currentRank.division || 3;

  const [players, setPlayers] = useState<PlayerInGame[]>([
    {
      userId: myUserId,
      username: myUsername,
      avatarId: 'avatar_default_01',
      tier: myTier,
      division: myDivision,
      lives: 3,
      isAlive: true,
      isReady: true,
      wordsSubmitted: 0,
      isDisconnected: false,
    },
    ...INITIAL_BOTS,
  ]);

  const [currentWord, setCurrentWord] = useState('PLANET');
  const [requiredLetter, setRequiredLetter] = useState('T');
  const [wordHistory, setWordHistory] = useState<string[]>(['PLANET']);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0); // Starts with user
  const [roundNumber, setRoundNumber] = useState(1);

  // Turn Timer state
  const TURN_DURATION_MS = 15000;
  const [remainingMs, setRemainingMs] = useState(TURN_DURATION_MS);
  const [lastRejectionReason, setLastRejectionReason] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activePlayer = players[activePlayerIndex];
  const isMyTurn = activePlayer?.userId === myUserId;

  // Active Authoritative Turn Clock simulation
  useEffect(() => {
    setRemainingMs(TURN_DURATION_MS);
    setLastRejectionReason(null);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, TURN_DURATION_MS - elapsed);
      setRemainingMs(left);

      if (left === 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 50);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [activePlayerIndex, roundNumber]);

  // Handle Timeout (Deducts a life; eliminates when lives reach 0)
  const handleTimeout = () => {
    let eliminated = false;
    let nextList: PlayerInGame[] = [];

    setPlayers((prev) => {
      const updated = [...prev];
      const target = updated[activePlayerIndex];
      if (target) {
        const nextLives = Math.max(0, (target.lives ?? 3) - 1);
        target.lives = nextLives;
        if (nextLives <= 0) {
          target.isAlive = false;
          target.placement = updated.filter((p) => p.isAlive).length;
          eliminated = true;
        }
      }
      nextList = updated;
      return updated;
    });

    if (eliminated) {
      soundManager.playEliminated();
    } else {
      soundManager.playWordRejected();
    }

    advanceToNextAlivePlayer(undefined, nextList);
  };

  const advanceToNextAlivePlayer = (nextWord?: string, customPlayersList?: PlayerInGame[]) => {
    const list = customPlayersList && customPlayersList.length > 0 ? customPlayersList : players;
    const alive = list.filter((p) => p.isAlive);
    if (alive.length <= 1) {
      soundManager.playVictory();
      soundManager.stopIntenseMusic();
      return;
    }

    // Advance turn index (randomized for multiple alive players)
    let nextIndex = (activePlayerIndex + 1) % list.length;

    if (alive.length > 2) {
      const otherAlive = alive.filter((p) => p.userId !== list[activePlayerIndex]?.userId);
      if (otherAlive.length > 0) {
        const chosen = otherAlive[Math.floor(Math.random() * otherAlive.length)];
        const idx = list.findIndex((p) => p.userId === chosen.userId);
        if (idx !== -1) nextIndex = idx;
      }
    } else {
      let attempts = 0;
      while (!list[nextIndex]?.isAlive && attempts < list.length) {
        nextIndex = (nextIndex + 1) % list.length;
        attempts++;
      }
    }

    const nextRound = roundNumber + 1;
    if (nextWord) {
      const cleaned = nextWord.toUpperCase();
      setCurrentWord(cleaned);
      const prefixLen = nextRound >= 20 ? 2 : 1;
      setRequiredLetter(cleaned.slice(-prefixLen));
      setWordHistory((prev) => [...prev, cleaned]);
    }

    if (nextRound >= 20) {
      soundManager.startIntenseMusic();
    }

    setRoundNumber(nextRound);
    setActivePlayerIndex(nextIndex);
  };

  // Bot Auto-turn Simulation
  useEffect(() => {
    if (!isMyTurn && activePlayer?.isAlive) {
      const botDelay = Math.random() * 2500 + 1500; // 1.5s - 4.0s
      const timer = setTimeout(() => {
        // Find a word starting with requiredLetter
        const botWord = Array.from(SAMPLE_DICTIONARY).find(
          (w) => w.startsWith(requiredLetter) && !wordHistory.includes(w)
        ) || `${requiredLetter}EST`;

        soundManager.playWordAccepted();

        setPlayers((prev) => {
          const updated = [...prev];
          if (updated[activePlayerIndex]) {
            updated[activePlayerIndex].wordsSubmitted += 1;
          }
          return updated;
        });

        advanceToNextAlivePlayer(botWord);
      }, botDelay);

      return () => clearTimeout(timer);
    }
  }, [isMyTurn, activePlayerIndex, requiredLetter]);

  // Player Word Submission
  const handleSubmitWord = (input: string) => {
    const trimmed = input.trim().toUpperCase();
    const expectedPrefix = requiredLetter.toUpperCase();

    // Strict suffix-only candidate assembly: prefix is already set, user submits lacking letters
    const candidate = `${expectedPrefix}${trimmed}`;

    // 1. Check length
    if (candidate.length < 3) {
      soundManager.playWordRejected();
      setLastRejectionReason('Word must be at least 3 letters long');
      setShakeTrigger((s) => s + 1);
      return;
    }
    if (candidate.length > 46) {
      soundManager.playWordRejected();
      setLastRejectionReason('Word cannot exceed 46 letters');
      setShakeTrigger((s) => s + 1);
      return;
    }

    // 2. Check starting prefix
    if (!candidate.startsWith(expectedPrefix)) {
      soundManager.playWordRejected();
      setLastRejectionReason(`Word must begin with '${expectedPrefix}'`);
      setShakeTrigger((s) => s + 1);
      return;
    }

    // 3. Check repeated word in match
    if (wordHistory.includes(candidate)) {
      soundManager.playWordRejected();
      setLastRejectionReason(`'${candidate}' has already been chained in this match!`);
      setShakeTrigger((s) => s + 1);
      return;
    }

    // Accepted!
    soundManager.playWordAccepted();

    setPlayers((prev) => {
      const updated = [...prev];
      if (updated[activePlayerIndex]) {
        updated[activePlayerIndex].wordsSubmitted += 1;
      }
      return updated;
    });

    advanceToNextAlivePlayer(candidate);
  };

  return (
    <ArenaHUD
      mode="CASUAL"
      roundNumber={roundNumber}
      currentWord={currentWord}
      requiredLetter={requiredLetter}
      wordHistory={wordHistory}
      players={players}
      activeUserId={activePlayer?.userId || ''}
      myUserId={myUserId}
      remainingMs={remainingMs}
      totalDurationMs={TURN_DURATION_MS}
      isMyTurn={isMyTurn}
      onSubmitWord={handleSubmitWord}
      lastRejectionReason={lastRejectionReason}
      shakeTrigger={shakeTrigger}
      onLeaveMatch={() => {
        soundManager.stopIntenseMusic();
        onExit();
      }}
    />
  );
};
