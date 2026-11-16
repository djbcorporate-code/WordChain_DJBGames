import {
  AcademicRankTier,
  AuthSession,
  CHESS_DEFAULT_CLOCK_SEC,
  CHESS_DEFAULT_INCREMENT_SEC,
  ChessVariant,
  ClientToServerEvents,
  DEFAULT_MATH_DIFFICULTY,
  GameLanguage,
  GameMode,
  GameType,
  IMPOSTOR_MAX_PLAYERS,
  IMPOSTOR_MIN_PLAYERS,
  MATH_DIFFICULTY_CONFIGS,
  MATH_DIFFICULTY_ORDER,
  MathDifficulty,
  MathOperationMode,
  PlayerInGame,
  ServerToClientEvents,
  getMathDifficultyForRankTier,
  getMathDifficultyForTiers,
} from '@wordchain/shared';
import { Server } from 'socket.io';
import { AnyGameRoom, RoomManager } from '../../game/RoomManager.js';
import { AuthenticatedSocket } from '../../sockets/socketAuth.js';
import { RankingService } from '../ranking/RankingService.js';

interface QueuedPlayer {
  user: AuthSession;
  socket: AuthenticatedSocket;
  playerInfo: PlayerInGame;
  gameType: GameType;
  mode: GameMode;
  language: GameLanguage;
  operationMode: MathOperationMode;
  difficulty: MathDifficulty;
  chessVariant: ChessVariant;
  clockSec: number;
  mmr: number;
  enqueuedAt: number;
}

export class MatchmakingService {
  private static instance: MatchmakingService | null = null;
  private queue: QueuedPlayer[] = [];
  private workerInterval: NodeJS.Timeout | null = null;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private bindCallbacksFn: ((room: AnyGameRoom) => void) | null = null;

  public static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  public initialize(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    bindCallbacks: (room: AnyGameRoom) => void
  ): void {
    this.io = io;
    this.bindCallbacksFn = bindCallbacks;

    if (!this.workerInterval) {
      this.workerInterval = setInterval(() => this.processQueue(), 1000);
    }
  }

  public async enqueue(
    user: AuthSession,
    socket: AuthenticatedSocket,
    playerInfo: PlayerInGame,
    mode: GameMode = 'CASUAL',
    mmr: number = 1000,
    language: GameLanguage = 'ENGLISH',
    gameType: GameType = 'WORDCHAIN',
    operationMode: MathOperationMode = 'MIXED',
    difficulty: MathDifficulty = DEFAULT_MATH_DIFFICULTY,
    chessVariant: ChessVariant = '2P',
    clockSec: number = CHESS_DEFAULT_CLOCK_SEC
  ): Promise<boolean> {
    const resolvedDifficulty: MathDifficulty =
      mode === 'RANKED'
        ? getMathDifficultyForRankTier(playerInfo.tier)
        : difficulty in MATH_DIFFICULTY_CONFIGS
        ? difficulty
        : DEFAULT_MATH_DIFFICULTY;

    const resolvedVariant: ChessVariant =
      chessVariant && ['2P', '3P', '4P'].includes(chessVariant) ? chessVariant : '2P';
    const resolvedClockSec = Math.min(1800, Math.max(60, clockSec || CHESS_DEFAULT_CLOCK_SEC));

    // Who Is The Impostor is strictly unranked
    if (gameType === 'IMPOSTOR' && mode === 'RANKED') {
      socket.emit('SOCKET_ERROR', {
        code: 'RANKED_NOT_SUPPORTED',
        message: 'Who Is The Impostor is unranked only. Join Public Casual or host a Private lobby!',
      });
      return false;
    }

    // Check Ranked eligibility if queuing for Ranked
    if (mode === 'RANKED') {
      const eligibility = await RankingService.checkRankedEligibility(user.userId);
      if (!eligibility.eligible) {
        socket.emit('SOCKET_ERROR', {
          code: 'RANKED_NOT_ELIGIBLE',
          message: eligibility.reason || 'You are not eligible for Ranked matches.',
        });
        return false;
      }
    }

    // Check if already in queue
    const existingIndex = this.queue.findIndex((p) => p.user.userId === user.userId);
    if (existingIndex !== -1) {
      this.queue[existingIndex].socket = socket;
      this.queue[existingIndex].language = language;
      this.queue[existingIndex].gameType = gameType;
      this.queue[existingIndex].operationMode = operationMode;
      this.queue[existingIndex].difficulty = resolvedDifficulty;
      this.queue[existingIndex].chessVariant = resolvedVariant;
      this.queue[existingIndex].clockSec = resolvedClockSec;
      this.queue[existingIndex].mode = mode;
      this.queue[existingIndex].mmr = mmr;
      return true;
    }

    this.queue.push({
      user,
      socket,
      playerInfo,
      gameType,
      mode,
      language,
      operationMode,
      difficulty: resolvedDifficulty,
      chessVariant: resolvedVariant,
      clockSec: resolvedClockSec,
      mmr,
      enqueuedAt: Date.now(),
    });

    socket.emit('QUEUE_STATUS', {
      inQueue: true,
      gameType,
      mode,
      language,
      operationMode,
      difficulty: gameType === 'MATHRACE' ? resolvedDifficulty : undefined,
      chessVariant: gameType === 'CHESS' ? resolvedVariant : undefined,
      position: this.queue.filter(
        (p) =>
          p.gameType === gameType &&
          p.mode === mode &&
          (gameType === 'MATHRACE'
            ? p.operationMode === operationMode &&
              (mode === 'RANKED' || p.difficulty === resolvedDifficulty)
            : gameType === 'CHESS'
            ? p.chessVariant === resolvedVariant
            : gameType === 'IMPOSTOR'
            ? true
            : p.language === language)
      ).length,
      estimatedWaitSec: mode === 'RANKED' ? 10 : 3,
    });

    // Check immediately if we can form a match
    this.processQueue();
    return true;
  }

  public dequeue(userId: string): void {
    const index = this.queue.findIndex((p) => p.user.userId === userId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      removed.socket.emit('QUEUE_STATUS', { inQueue: false });
    }
  }

  public isQueued(userId: string): boolean {
    return this.queue.some((p) => p.user.userId === userId);
  }

  private processQueue(): void {
    if (this.queue.length === 0 || !this.io || !this.bindCallbacksFn) return;

    // Filter out disconnected sockets
    this.queue = this.queue.filter((p) => p.socket.connected);

    this.processCasualQueue();
    this.processRankedQueue();
    this.processMathCasualQueue();
    this.processMathRankedQueue();
    this.processChessQueues();
    this.processImpostorCasualQueue();
  }

  private generateBotScholar(tier: AcademicRankTier = 'NURSERY', division: number = 3): PlayerInGame {
    const names = [
      'Scholar_Hypatia',
      'Scholar_Newton',
      'Scholar_Curie',
      'Scholar_Tesla',
      'Scholar_Ada',
      'Scholar_Pascal',
      'Scholar_Galileo',
      'Scholar_Euler',
      'Scholar_Turing',
      'Scholar_Darwin',
    ];
    const name = `${names[Math.floor(Math.random() * names.length)]}_${Math.floor(100 + Math.random() * 900)}`;
    const avatarNum = Math.floor(1 + Math.random() * 4);
    return {
      userId: `guest-bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: name,
      avatarId: `avatar_0${avatarNum}`,
      tier,
      division,
      lives: 3,
      isAlive: true,
      isReady: true,
      wordsSubmitted: 0,
      isDisconnected: false,
    };
  }

  private processCasualQueue(): void {
    const languages: GameLanguage[] = ['ENGLISH', 'TAGALOG', 'BISAYA', 'MIXED'];
    for (const lang of languages) {
      this.processCasualQueueForLanguage(lang);
    }
  }

  private processCasualQueueForLanguage(lang: GameLanguage): void {
    const casualQueue = this.queue.filter(
      (p) => p.gameType === 'WORDCHAIN' && p.mode === 'CASUAL' && p.language === lang
    );
    if (casualQueue.length === 0) return;

    // Rule 1: Instant match if 4 players are in queue
    // Rule 2: Match 2 or 3 players if oldest player has waited >= 2.5 seconds
    const oldestWaitMs = casualQueue.length > 0 ? Date.now() - casualQueue[0].enqueuedAt : 0;
    const shouldStartWithFewer = casualQueue.length >= 2 && oldestWaitMs >= 2500;
    const hasFullRoom = casualQueue.length >= 4;

    if (hasFullRoom || shouldStartWithFewer) {
      const batchSize = Math.min(4, casualQueue.length);
      const matchedBatch = casualQueue.slice(0, batchSize);

      // Remove from queue
      for (const matched of matchedBatch) {
        const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
        if (idx !== -1) this.queue.splice(idx, 1);
      }

      this.createCasualMatch(matchedBatch, lang);
      return;
    }

    // Rule 3: Fast-match solo player with automated scholar opponents after 3.5 seconds
    if (casualQueue.length === 1 && oldestWaitMs >= 3500) {
      const solo = casualQueue[0];
      const idx = this.queue.findIndex((p) => p.user.userId === solo.user.userId);
      if (idx !== -1) this.queue.splice(idx, 1);

      const bot = this.generateBotScholar('NURSERY', 3);
      this.createCasualMatch([solo], lang, [bot]);
      return;
    }

    // Broadcast updated queue positions to remaining players
    this.emitQueueWaitingStatus(casualQueue, 'WORDCHAIN', 'CASUAL', { language: lang }, 3, 1);
  }

  private processRankedQueue(): void {
    const languages: GameLanguage[] = ['ENGLISH', 'TAGALOG', 'BISAYA', 'MIXED'];
    for (const lang of languages) {
      this.processRankedQueueForLanguage(lang);
    }
  }

  private processRankedQueueForLanguage(lang: GameLanguage): void {
    const rankedQueue = this.queue.filter(
      (p) => p.gameType === 'WORDCHAIN' && p.mode === 'RANKED' && p.language === lang
    );
    const now = Date.now();

    if (rankedQueue.length < 2) {
      // If a solo ranked player has waited >= 5 seconds without finding another human, pair with an AI Scholar opponent!
      const soloPlayer = rankedQueue[0];
      if (soloPlayer && (now - soloPlayer.enqueuedAt) >= 5000) {
        const idx = this.queue.findIndex((p) => p.user.userId === soloPlayer.user.userId);
        if (idx !== -1) this.queue.splice(idx, 1);

        const bot = this.generateBotScholar(soloPlayer.playerInfo.tier, soloPlayer.playerInfo.division);
        this.createRankedMatch([soloPlayer], lang, [bot]);
        return;
      }

      this.emitQueueWaitingStatus(rankedQueue, 'WORDCHAIN', 'RANKED', { language: lang }, 5, 1);
      return;
    }

    // Sort by MMR to find closely matched scholars
    const sorted = [...rankedQueue].sort((a, b) => a.mmr - b.mmr);

    // Strategy 1: Check for 4-player FFA if 4+ players queued and MMR tolerance matches
    if (sorted.length >= 4) {
      for (let i = 0; i <= sorted.length - 4; i++) {
        const pod = sorted.slice(i, i + 4);
        const minMmr = pod[0].mmr;
        const maxMmr = pod[3].mmr;
        const mmrSpread = maxMmr - minMmr;
        const maxWait = Math.max(...pod.map((p) => now - p.enqueuedAt));
        const allowedTolerance = Math.min(300, 100 + Math.floor(maxWait / 5000) * 50);

        if (mmrSpread <= allowedTolerance) {
          for (const matched of pod) {
            const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
            if (idx !== -1) this.queue.splice(idx, 1);
          }

          this.createRankedMatch(pod, lang);
          return;
        }
      }
    }

    // Strategy 2: Match 2 players (1v1 Ranked Duel) if oldest queued player has waited >= 2.5 seconds
    const oldestWaitMs = now - sorted[0].enqueuedAt;
    const shouldMatchPair = oldestWaitMs >= 2500;

    if (shouldMatchPair) {
      for (let i = 0; i <= sorted.length - 2; i++) {
        const pair = sorted.slice(i, i + 2);
        const mmrSpread = Math.abs(pair[1].mmr - pair[0].mmr);
        const maxWait = Math.max(now - pair[0].enqueuedAt, now - pair[1].enqueuedAt);
        const allowedTolerance = Math.min(400, 150 + Math.floor(maxWait / 2000) * 50);

        if (mmrSpread <= allowedTolerance || maxWait >= 4000) {
          for (const matched of pair) {
            const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
            if (idx !== -1) this.queue.splice(idx, 1);
          }

          this.createRankedMatch(pair, lang);
          return;
        }
      }
    }

    // Broadcast queue status to ranked players of this language
    this.emitQueueWaitingStatus(rankedQueue, 'WORDCHAIN', 'RANKED', { language: lang }, 6, 2);
  }

  private removeFromQueue(matchedPlayers: QueuedPlayer[]): void {
    for (const matched of matchedPlayers) {
      const idx = this.queue.findIndex((p) => p.user.userId === matched.user.userId);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
  }

  private emitQueueWaitingStatus(
    players: QueuedPlayer[],
    gameType: GameType,
    mode: GameMode,
    extra: {
      language?: GameLanguage;
      operationMode?: MathOperationMode;
      difficulty?: MathDifficulty;
      chessVariant?: ChessVariant;
    },
    targetWaitSec: number,
    minRemainingSec: number = 1
  ): void {
    const now = Date.now();
    players.forEach((p, idx) => {
      p.socket.emit('QUEUE_STATUS', {
        inQueue: true,
        gameType,
        mode,
        ...extra,
        difficulty: extra.difficulty ?? (gameType === 'MATHRACE' ? p.difficulty : undefined),
        chessVariant: extra.chessVariant ?? (gameType === 'CHESS' ? p.chessVariant : undefined),
        position: idx + 1,
        estimatedWaitSec: Math.max(minRemainingSec, targetWaitSec - Math.floor((now - p.enqueuedAt) / 1000)),
      });
    });
  }

  private processChessQueues(): void {
    const variants: ChessVariant[] = ['2P', '3P', '4P'];
    const now = Date.now();

    for (const variant of variants) {
      const requiredCount = variant === '4P' ? 4 : variant === '3P' ? 3 : 2;

      // 1. Casual Queue
      const casualChess = this.queue.filter(
        (p) => p.gameType === 'CHESS' && p.mode === 'CASUAL' && p.chessVariant === variant
      );
      if (casualChess.length > 0) {
        const oldestWaitMs = now - casualChess[0].enqueuedAt;
        if (casualChess.length >= requiredCount) {
          const batch = casualChess.slice(0, requiredCount);
          this.removeFromQueue(batch);
          this.createChessMatch(batch, 'CASUAL', variant);
        } else if (oldestWaitMs >= 3500) {
          const batch = casualChess.slice(0, requiredCount);
          this.removeFromQueue(batch);
          const bots: PlayerInGame[] = [];
          const needed = requiredCount - batch.length;
          for (let i = 0; i < needed; i++) {
            bots.push(this.generateBotScholar('NURSERY', 3));
          }
          this.createChessMatch(batch, 'CASUAL', variant, bots);
        } else {
          this.emitQueueWaitingStatus(casualChess, 'CHESS', 'CASUAL', { chessVariant: variant }, 3, 1);
        }
      }

      // 2. Ranked Queue
      const rankedChess = this.queue.filter(
        (p) => p.gameType === 'CHESS' && p.mode === 'RANKED' && p.chessVariant === variant
      );
      if (rankedChess.length > 0) {
        const sorted = [...rankedChess].sort((a, b) => a.mmr - b.mmr);
        const oldestWaitMs = now - sorted[0].enqueuedAt;

        if (sorted.length >= requiredCount) {
          let matched = false;
          for (let i = 0; i <= sorted.length - requiredCount; i++) {
            const pod = sorted.slice(i, i + requiredCount);
            const mmrSpread = pod[pod.length - 1].mmr - pod[0].mmr;
            const maxWait = Math.max(...pod.map((p) => now - p.enqueuedAt));
            const allowedTolerance = Math.min(400, 150 + Math.floor(maxWait / 2000) * 50);

            if (mmrSpread <= allowedTolerance || maxWait >= 4000) {
              this.removeFromQueue(pod);
              this.createChessMatch(pod, 'RANKED', variant);
              matched = true;
              break;
            }
          }
          if (!matched) {
            this.emitQueueWaitingStatus(rankedChess, 'CHESS', 'RANKED', { chessVariant: variant }, 6, 2);
          }
        } else if (oldestWaitMs >= 5000) {
          const pod = sorted.slice(0, requiredCount);
          this.removeFromQueue(pod);
          const lead = pod[0];
          const bots: PlayerInGame[] = [];
          const needed = requiredCount - pod.length;
          for (let i = 0; i < needed; i++) {
            bots.push(this.generateBotScholar(lead.playerInfo.tier, lead.playerInfo.division));
          }
          this.createChessMatch(pod, 'RANKED', variant, bots);
        } else {
          this.emitQueueWaitingStatus(rankedChess, 'CHESS', 'RANKED', { chessVariant: variant }, 5, 1);
        }
      }
    }
  }

  private createChessMatch(
    players: QueuedPlayer[],
    mode: 'CASUAL' | 'RANKED',
    variant: ChessVariant = '2P',
    botOpponents: PlayerInGame[] = []
  ): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];
    const totalCount = players.length + botOpponents.length;

    const room = roomManager.createChessRoom({
      mode,
      variant,
      clockSec: host.clockSec || CHESS_DEFAULT_CLOCK_SEC,
      incrementSec: CHESS_DEFAULT_INCREMENT_SEC,
      hostUserId: host.user.userId,
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        userId: p.playerInfo.userId,
        username: p.playerInfo.username,
        avatarId: p.playerInfo.avatarId,
        tier: p.playerInfo.tier,
        division: p.playerInfo.division,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        gameType: 'CHESS',
        mode,
        chessVariant: variant,
        countdownSec: 3,
      });
    }

    for (const bot of botOpponents) {
      room.addPlayer({
        userId: bot.userId,
        username: bot.username,
        avatarId: bot.avatarId,
        tier: bot.tier,
        division: bot.division,
        isReady: true,
      });
    }

    this.io!.to(room.roomId).emit('CHESS_ROOM_STATE_UPDATE', room.getSummary());
    room.startCountdown();
    console.log(
      `[Matchmaking] Chess ${mode} (${variant}) created: ${room.roomCode} with ${totalCount} players`
    );
  }

  private processImpostorCasualQueue(): void {
    const impostorQueue = this.queue.filter(
      (p) => p.gameType === 'IMPOSTOR' && p.mode === 'CASUAL'
    );
    if (impostorQueue.length === 0) return;

    const now = Date.now();
    const oldestWaitMs = now - impostorQueue[0].enqueuedAt;

    if (
      impostorQueue.length >= IMPOSTOR_MAX_PLAYERS ||
      (impostorQueue.length >= IMPOSTOR_MIN_PLAYERS && oldestWaitMs >= 4000)
    ) {
      const batch = impostorQueue.slice(0, IMPOSTOR_MAX_PLAYERS);
      this.removeFromQueue(batch);
      this.createImpostorCasualMatch(batch);
      return;
    }

    // Strictly wait for >= 3 human players (no AI bots in social deduction)
    this.emitQueueWaitingStatus(
      impostorQueue,
      'IMPOSTOR',
      'CASUAL',
      {},
      impostorQueue.length >= IMPOSTOR_MIN_PLAYERS ? 4 : 15,
      1
    );
  }

  private createImpostorCasualMatch(players: QueuedPlayer[]): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];
    const impostorCount = players.length >= 7 ? 2 : 1;

    const room = roomManager.createImpostorRoom({
      mode: 'CASUAL',
      hostUserId: host.user.userId,
      settings: {
        category: 'RANDOM',
        difficulty: 'ALL',
        impostorCount,
        conversationSec: 90,
      },
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        userId: p.playerInfo.userId,
        username: p.playerInfo.username,
        avatarId: p.playerInfo.avatarId,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        gameType: 'IMPOSTOR',
        mode: 'CASUAL',
        countdownSec: 3,
      });
    }

    for (const p of players) {
      p.socket.emit(
        'IMPOSTOR_ROOM_STATE_UPDATE',
        room.getSummaryForUser(p.playerInfo.userId)
      );
    }

    room.startCountdown();
    console.log(
      `[Matchmaking] Impostor Casual match created: ${room.roomCode} with ${players.length} human agents (${impostorCount} impostor${impostorCount > 1 ? 's' : ''})`
    );
  }

  private processMathCasualQueue(): void {
    const opModes: MathOperationMode[] = ['MIXED', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
    for (const opMode of opModes) {
      for (const difficulty of MATH_DIFFICULTY_ORDER) {
        const mathQueue = this.queue.filter(
          (p) =>
            p.gameType === 'MATHRACE' &&
            p.mode === 'CASUAL' &&
            p.operationMode === opMode &&
            p.difficulty === difficulty
        );
        if (mathQueue.length === 0) continue;

        const oldestWaitMs = Date.now() - mathQueue[0].enqueuedAt;
        const shouldStartWithFewer = mathQueue.length >= 2 && oldestWaitMs >= 2500;
        const hasFullRoom = mathQueue.length >= 6;

        if (hasFullRoom || shouldStartWithFewer) {
          const batchSize = Math.min(6, mathQueue.length);
          const matchedBatch = mathQueue.slice(0, batchSize);
          this.removeFromQueue(matchedBatch);
          this.createMathMatch(matchedBatch, 'CASUAL', opMode, difficulty);
          continue;
        }

        // Solo player: pair with 2 AI bots so the match has a 3-number race
        if (mathQueue.length === 1 && oldestWaitMs >= 3500) {
          const solo = mathQueue[0];
          this.removeFromQueue([solo]);
          const bots = [
            this.generateBotScholar('NURSERY', 3),
            this.generateBotScholar('NURSERY', 2),
          ];
          this.createMathMatch([solo], 'CASUAL', opMode, difficulty, bots);
          continue;
        }

        this.emitQueueWaitingStatus(
          mathQueue,
          'MATHRACE',
          'CASUAL',
          { operationMode: opMode, difficulty },
          3,
          1
        );
      }
    }
  }

  private processMathRankedQueue(): void {
    const opModes: MathOperationMode[] = ['MIXED', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
    const now = Date.now();

    for (const opMode of opModes) {
      const rankedQueue = this.queue.filter(
        (p) => p.gameType === 'MATHRACE' && p.mode === 'RANKED' && p.operationMode === opMode
      );
      if (rankedQueue.length === 0) continue;

      if (rankedQueue.length < 2) {
        const soloPlayer = rankedQueue[0];
        if (soloPlayer && now - soloPlayer.enqueuedAt >= 5000) {
          this.removeFromQueue([soloPlayer]);
          const bots = [
            this.generateBotScholar(soloPlayer.playerInfo.tier, soloPlayer.playerInfo.division),
            this.generateBotScholar(soloPlayer.playerInfo.tier, soloPlayer.playerInfo.division),
          ];
          const rankedDifficulty = getMathDifficultyForTiers([soloPlayer.playerInfo.tier]);
          this.createMathMatch([soloPlayer], 'RANKED', opMode, rankedDifficulty, bots);
          continue;
        }

        this.emitQueueWaitingStatus(rankedQueue, 'MATHRACE', 'RANKED', { operationMode: opMode }, 5, 1);
        continue;
      }

      const sorted = [...rankedQueue].sort((a, b) => a.mmr - b.mmr);
      const oldestWaitMs = now - sorted[0].enqueuedAt;

      if (sorted.length >= 6) {
        for (let i = 0; i <= sorted.length - 6; i++) {
          const pod = sorted.slice(i, i + 6);
          const mmrSpread = pod[5].mmr - pod[0].mmr;
          const maxWait = Math.max(...pod.map((p) => now - p.enqueuedAt));
          const allowedTolerance = Math.min(350, 120 + Math.floor(maxWait / 5000) * 50);

          if (mmrSpread <= allowedTolerance) {
            this.removeFromQueue(pod);
            const rankedDifficulty = getMathDifficultyForTiers(pod.map((p) => p.playerInfo.tier));
            this.createMathMatch(pod, 'RANKED', opMode, rankedDifficulty);
            return;
          }
        }
      }

      if (oldestWaitMs >= 2500) {
        const batchSize = Math.min(6, sorted.length);
        const pod = sorted.slice(0, batchSize);
        const mmrSpread = pod[pod.length - 1].mmr - pod[0].mmr;
        const maxWait = Math.max(...pod.map((p) => now - p.enqueuedAt));
        const allowedTolerance = Math.min(400, 150 + Math.floor(maxWait / 2000) * 50);

        if (mmrSpread <= allowedTolerance || maxWait >= 4000) {
          this.removeFromQueue(pod);
          const rankedDifficulty = getMathDifficultyForTiers(pod.map((p) => p.playerInfo.tier));
          this.createMathMatch(pod, 'RANKED', opMode, rankedDifficulty);
          continue;
        }
      }

      this.emitQueueWaitingStatus(rankedQueue, 'MATHRACE', 'RANKED', { operationMode: opMode }, 6, 2);
    }
  }

  private createMathMatch(
    players: QueuedPlayer[],
    mode: 'CASUAL' | 'RANKED',
    operationMode: MathOperationMode = 'MIXED',
    difficulty: MathDifficulty = DEFAULT_MATH_DIFFICULTY,
    botOpponents: PlayerInGame[] = []
  ): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];
    const totalCount = players.length + botOpponents.length;

    const room = roomManager.createMathRoom({
      mode,
      operationMode,
      difficulty,
      hostUserId: host.user.userId,
      maxPlayers: Math.max(2, Math.min(6, totalCount)),
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        userId: p.playerInfo.userId,
        username: p.playerInfo.username,
        avatarId: p.playerInfo.avatarId,
        tier: p.playerInfo.tier,
        division: p.playerInfo.division,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        gameType: 'MATHRACE',
        mode,
        operationMode,
        difficulty,
        countdownSec: 3,
      });
    }

    for (const bot of botOpponents) {
      room.addPlayer({
        userId: bot.userId,
        username: bot.username,
        avatarId: bot.avatarId,
        tier: bot.tier,
        division: bot.division,
        isReady: true,
      });
    }

    this.io!.to(room.roomId).emit('MATH_ROOM_STATE_UPDATE', room.getSummary());
    room.startCountdown();
    console.log(
      `[Matchmaking] MathBlitz ${mode} match (${operationMode}/${difficulty}) created: ${room.roomCode} with ${totalCount} players`
    );
  }

  private createCasualMatch(
    players: QueuedPlayer[],
    language: GameLanguage = 'ENGLISH',
    botOpponents: PlayerInGame[] = []
  ): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];
    const totalCount = players.length + botOpponents.length;

    const room = roomManager.createRoom({
      mode: 'CASUAL',
      language,
      hostUserId: host.user.userId,
      startTimerSec: 15,
      minTimerSec: 8,
      maxPlayers: Math.max(2, totalCount),
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        ...p.playerInfo,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        gameType: 'WORDCHAIN',
        mode: 'CASUAL',
        language,
        countdownSec: 3,
      });
    }

    for (const bot of botOpponents) {
      room.addPlayer({
        ...bot,
        isReady: true,
      });
    }

    this.io!.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
    room.startCountdown();
    console.log(
      `[Matchmaking] Casual match (${language}) created: ${room.roomCode} with ${totalCount} scholars`
    );
  }

  private createRankedMatch(
    players: QueuedPlayer[],
    language: GameLanguage = 'ENGLISH',
    botOpponents: PlayerInGame[] = []
  ): void {
    const roomManager = RoomManager.getInstance();
    const host = players[0];
    const totalCount = players.length + botOpponents.length;

    const room = roomManager.createRoom({
      mode: 'RANKED',
      language,
      hostUserId: host.user.userId,
      startTimerSec: 15,
      minTimerSec: 6, // Competitive floor: 6s
      maxPlayers: Math.max(2, totalCount),
    });

    this.bindCallbacksFn!(room);

    for (const p of players) {
      room.addPlayer({
        ...p.playerInfo,
        isReady: true,
      });

      p.socket.join(room.roomId);
      p.socket.data.roomId = room.roomId;

      p.socket.emit('QUEUE_STATUS', { inQueue: false });
      p.socket.emit('MATCH_FOUND', {
        roomId: room.roomId,
        gameType: 'WORDCHAIN',
        mode: 'RANKED',
        language,
        countdownSec: 3,
      });
    }

    for (const bot of botOpponents) {
      room.addPlayer({
        ...bot,
        isReady: true,
      });
    }

    this.io!.to(room.roomId).emit('ROOM_STATE_UPDATE', room.getSummary());
    room.startCountdown();
    console.log(
      `[Matchmaking] Ranked match (${language}) created: ${room.roomCode} with ${totalCount} scholars (avg MMR: ${Math.round(
        players.reduce((sum, p) => sum + p.mmr, 0) / players.length
      )})`
    );
  }

  public cleanup(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.queue = [];
  }
}

