import {
  clampImpostorCount,
  DEFAULT_IMPOSTOR_SETTINGS,
  GameMode,
  getImpostorCategoryMeta,
  IMPOSTOR_CATEGORIES,
  IMPOSTOR_EJECTION_SEC,
  IMPOSTOR_MAX_PLAYERS,
  IMPOSTOR_MIN_PLAYERS,
  IMPOSTOR_ROLE_REVEAL_SEC,
  IMPOSTOR_VOTING_SEC,
  ImpostorCategoryId,
  ImpostorDifficulty,
  ImpostorEjectionResult,
  ImpostorPhase,
  ImpostorPlayerInGame,
  ImpostorResolvedCategory,
  ImpostorRole,
  ImpostorRoomSummary,
  ImpostorSettings,
  ImpostorWinnerFaction,
  pickImpostorPrompt,
  RoomChatMessage,
  RoomStatus,
} from '@wordchain/shared';
import crypto from 'crypto';

export interface ImpostorGameRoomCallbacks {
  onStateChange?: () => void;
  onCountdownTick?: (payload: { remainingSec: number }) => void;
  onMatchEnded?: (payload: {
    winnerFaction: ImpostorWinnerFaction;
    secretWord: string;
    impostorHint: string;
    resolvedCategory: ImpostorResolvedCategory;
    players: ImpostorPlayerInGame[];
  }) => void;
}

export interface ImpostorPhaseDurationsMs {
  roleRevealMs?: number;
  conversationMs?: number;
  votingMs?: number;
  ejectionMs?: number;
}

export interface ImpostorGameRoomOptions {
  roomId?: string;
  roomCode?: string;
  mode: GameMode;
  hostUserId: string;
  settings?: Partial<ImpostorSettings>;
  countdownDelayMs?: number;
  phaseDurationsMs?: ImpostorPhaseDurationsMs;
  callbacks?: ImpostorGameRoomCallbacks;
}

const VALID_DIFFICULTIES: ImpostorDifficulty[] = ['ALL', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'];
const VALID_CATEGORIES = new Set<string>([
  'RANDOM',
  ...IMPOSTOR_CATEGORIES.map((c) => c.id),
]);

export function sanitizeImpostorSettings(
  current: ImpostorSettings,
  patch?: Partial<ImpostorSettings>
): ImpostorSettings {
  if (!patch) return { ...current };
  const category: ImpostorCategoryId =
    patch.category && VALID_CATEGORIES.has(patch.category)
      ? patch.category
      : current.category;
  const difficulty: ImpostorDifficulty =
    patch.difficulty && VALID_DIFFICULTIES.includes(patch.difficulty)
      ? patch.difficulty
      : current.difficulty;
  const impostorCount =
    typeof patch.impostorCount === 'number' && Number.isFinite(patch.impostorCount)
      ? Math.max(1, Math.min(3, Math.floor(patch.impostorCount)))
      : current.impostorCount;
  const conversationSec =
    typeof patch.conversationSec === 'number' && Number.isFinite(patch.conversationSec)
      ? Math.max(30, Math.min(180, Math.round(patch.conversationSec)))
      : current.conversationSec;
  const blindMode =
    typeof patch.blindMode === 'boolean' ? patch.blindMode : current.blindMode;

  return {
    category,
    difficulty,
    impostorCount,
    conversationSec,
    blindMode,
  };
}

export class ImpostorGameRoom {
  public readonly roomId: string;
  public readonly roomCode: string;
  public readonly gameType = 'IMPOSTOR' as const;
  public readonly mode: GameMode;
  public readonly minPlayers = IMPOSTOR_MIN_PLAYERS;
  public readonly maxPlayers = IMPOSTOR_MAX_PLAYERS;
  public readonly createdAt: number = Date.now();
  public hostUserId: string;

  public status: RoomStatus = 'WAITING';
  public settings: ImpostorSettings;
  public players: Map<string, ImpostorPlayerInGame> = new Map();

  public phase?: ImpostorPhase;
  public roundNumber: number = 0;
  public phaseStartedAtUtc?: number;
  public phaseDeadlineUtc?: number;
  public resolvedCategory?: ImpostorResolvedCategory;
  public lastEjection?: ImpostorEjectionResult;
  public winnerFaction?: ImpostorWinnerFaction;

  // Strictly private server state (never emitted unmasked during active play)
  private roles: Map<string, ImpostorRole> = new Map();
  private secretWord: string = '';
  private impostorHint: string = '';
  private votes: Map<string, string> = new Map(); // voterUserId -> targetUserId | 'SKIP'

  private chatMessages: RoomChatMessage[] = [];
  private countdownTimer: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  private readonly countdownDelayMs: number;
  private readonly phaseDurationsMs: ImpostorPhaseDurationsMs;
  private callbacks: ImpostorGameRoomCallbacks;

  constructor(options: ImpostorGameRoomOptions) {
    this.roomId = options.roomId || crypto.randomUUID();
    this.roomCode = options.roomCode || this.generateRoomCode();
    this.mode = options.mode;
    this.hostUserId = options.hostUserId;
    this.settings = sanitizeImpostorSettings(
      DEFAULT_IMPOSTOR_SETTINGS,
      options.settings
    );
    this.countdownDelayMs = options.countdownDelayMs ?? 1000;
    this.phaseDurationsMs = options.phaseDurationsMs ?? {};
    this.callbacks = options.callbacks || {};
  }

  public setCallbacks(callbacks: ImpostorGameRoomCallbacks): void {
    this.callbacks = callbacks;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  public addPlayer(input: {
    userId: string;
    username: string;
    avatarId: string;
    isReady?: boolean;
  }): boolean {
    const existing = this.players.get(input.userId);
    if (existing) {
      existing.username = input.username;
      existing.avatarId = input.avatarId;
      existing.isDisconnected = false;
      existing.disconnectedAt = undefined;
      return true;
    }

    if (this.status !== 'WAITING') return false;
    if (this.players.size >= this.maxPlayers) return false;

    this.players.set(input.userId, {
      userId: input.userId,
      username: input.username,
      avatarId: input.avatarId,
      isAlive: true,
      isReady:
        this.mode === 'CASUAL'
          ? true
          : input.isReady ?? input.userId === this.hostUserId,
      readyToVote: false,
      isDisconnected: false,
      hasVoted: false,
      votesReceived: 0,
    });

    return true;
  }

  public removePlayer(userId: string): {
    wasHost?: boolean;
    newHostId?: string;
    shouldClose: boolean;
  } {
    const wasHost = this.hostUserId === userId;
    const target = this.players.get(userId);
    if (!target) {
      return { wasHost, shouldClose: this.players.size === 0 };
    }

    this.players.delete(userId);
    this.roles.delete(userId);
    this.votes.delete(userId);

    // Clear votes targeting the departed player during voting
    if (this.phase === 'VOTING') {
      for (const [voterId, votedTarget] of this.votes.entries()) {
        if (votedTarget === userId) {
          this.votes.delete(voterId);
          const voter = this.players.get(voterId);
          if (voter) voter.hasVoted = false;
        }
      }
    }

    let newHostId: string | undefined;
    if (wasHost && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) {
        this.hostUserId = nextHost.userId;
        newHostId = nextHost.userId;
        if (this.status === 'WAITING') {
          nextHost.isReady = true;
        }
      }
    }

    if (this.players.size === 0) {
      this.cleanup();
      return { wasHost, shouldClose: true, newHostId };
    }

    if (this.status === 'COUNTDOWN' && this.players.size < this.minPlayers) {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.status = 'WAITING';
      this.appendSystemMessage(
        `${target.username} left — need at least ${this.minPlayers} agents to launch.`
      );
      this.callbacks.onStateChange?.();
      return { wasHost, shouldClose: false, newHostId };
    }

    if (this.status === 'IN_PROGRESS') {
      this.appendSystemMessage(`${target.username} disconnected from the mission.`);
      const winCheck = this.evaluateWinCondition();
      if (winCheck) {
        this.finishMatch(winCheck);
        return { wasHost, shouldClose: false, newHostId };
      }

      if (this.phase === 'CONVERSATION' && this.checkAllAliveReadyToVote()) {
        this.enterVotingPhase();
        return { wasHost, shouldClose: false, newHostId };
      }

      if (this.phase === 'VOTING' && this.checkAllAliveVoted()) {
        this.resolveVotingPhase();
        return { wasHost, shouldClose: false, newHostId };
      }
    }

    this.callbacks.onStateChange?.();
    return { wasHost, shouldClose: false, newHostId };
  }

  public kickPlayer(
    requesterId: string,
    targetUserId: string
  ): { success: boolean; error?: string; kickedPlayer?: ImpostorPlayerInGame } {
    if (this.mode !== 'PRIVATE' || this.status !== 'WAITING') {
      return { success: false, error: 'Kicking is only allowed in waiting private rooms.' };
    }
    if (this.hostUserId !== requesterId) {
      return { success: false, error: 'Only the room creator can remove agents.' };
    }
    if (requesterId === targetUserId) {
      return { success: false, error: 'You cannot kick yourself.' };
    }
    const target = this.players.get(targetUserId);
    if (!target) {
      return { success: false, error: 'Agent not found in this room.' };
    }

    this.players.delete(targetUserId);
    this.callbacks.onStateChange?.();
    return { success: true, kickedPlayer: target };
  }

  public setPlayerReady(userId: string, isReady: boolean): boolean {
    if (this.status !== 'WAITING') return false;
    const player = this.players.get(userId);
    if (!player) return false;
    player.isReady = isReady;
    return true;
  }

  public updateSettings(
    requesterId: string,
    patch: Partial<ImpostorSettings>
  ): { ok: boolean; error?: string } {
    if (this.hostUserId !== requesterId) {
      return { ok: false, error: 'Only the lobby Host can adjust mission settings.' };
    }
    if (this.status !== 'WAITING') {
      return { ok: false, error: 'Settings can only be changed while in the lobby.' };
    }

    this.settings = sanitizeImpostorSettings(this.settings, patch);
    this.callbacks.onStateChange?.();
    return { ok: true };
  }

  public handleDisconnect(userId: string): void {
    const player = this.players.get(userId);
    if (!player) return;
    player.isDisconnected = true;
    player.disconnectedAt = Date.now();
    this.callbacks.onStateChange?.();
  }

  public handleReconnect(userId: string): boolean {
    const player = this.players.get(userId);
    if (!player) return false;
    player.isDisconnected = false;
    player.disconnectedAt = undefined;
    this.callbacks.onStateChange?.();
    return true;
  }

  public canSendPublicChat(userId: string): boolean {
    if (this.status !== 'IN_PROGRESS') return true;
    const player = this.players.get(userId);
    return Boolean(player && player.isAlive);
  }

  public addChatMessage(msg: RoomChatMessage): void {
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
  }

  public getChatHistory(): RoomChatMessage[] {
    return [...this.chatMessages];
  }

  private appendSystemMessage(text: string): RoomChatMessage {
    const msg: RoomChatMessage = {
      id: crypto.randomUUID(),
      roomId: this.roomId,
      userId: 'SYSTEM',
      username: 'CONTROL',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    return msg;
  }

  public startCountdown(): { ok: boolean; error?: string } {
    if (this.status !== 'WAITING') {
      return { ok: false, error: 'Match already starting or active.' };
    }
    if (this.players.size < this.minPlayers) {
      return {
        ok: false,
        error: `At least ${this.minPlayers} human players are required to launch.`,
      };
    }

    this.status = 'COUNTDOWN';
    let remaining = 3;
    this.callbacks.onStateChange?.();
    this.callbacks.onCountdownTick?.({ remainingSec: remaining });

    if (this.countdownDelayMs <= 0) {
      this.beginMatch();
      return { ok: true };
    }

    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        this.callbacks.onCountdownTick?.({ remainingSec: remaining });
      } else {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.beginMatch();
      }
    }, this.countdownDelayMs);

    return { ok: true };
  }

  public startMatch(): void {
    this.beginMatch();
  }

  public beginMatch(): void {
    this.clearTimers();

    const playerList = Array.from(this.players.values());
    if (playerList.length < this.minPlayers) {
      this.status = 'WAITING';
      this.callbacks.onStateChange?.();
      return;
    }

    const effectiveImpostors = clampImpostorCount(
      this.settings.impostorCount,
      playerList.length
    );

    // Fisher-Yates shuffle to assign impostors uniformly
    const shuffledIds = playerList.map((p) => p.userId);
    for (let i = shuffledIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }

    const impostorSet = new Set(shuffledIds.slice(0, effectiveImpostors));
    this.roles.clear();
    this.votes.clear();
    this.lastEjection = undefined;
    this.winnerFaction = undefined;

    for (const player of playerList) {
      const role: ImpostorRole = impostorSet.has(player.userId)
        ? 'IMPOSTOR'
        : 'CREWMATE';
      this.roles.set(player.userId, role);
      player.isAlive = true;
      player.readyToVote = false;
      player.hasVoted = false;
      player.votesReceived = 0;
      player.revealedRole = undefined;
    }

    const prompt = pickImpostorPrompt(
      this.settings,
      playerList,
      this.hostUserId
    );
    this.resolvedCategory = prompt.resolvedCategory;
    this.secretWord = prompt.secretWord;
    this.impostorHint = prompt.impostorHint;

    this.status = 'IN_PROGRESS';
    this.roundNumber = 1;
    this.phase = 'ROLE_REVEAL';

    const revealMs =
      this.phaseDurationsMs.roleRevealMs ?? IMPOSTOR_ROLE_REVEAL_SEC * 1000;
    const now = Date.now();
    this.phaseStartedAtUtc = now;
    this.phaseDeadlineUtc = now + revealMs;

    this.appendSystemMessage(
      this.settings.blindMode
        ? `Classified Briefing started! BLIND MODE active — nobody knows if they are the Impostor (${effectiveImpostors} hidden).`
        : `Classified Briefing started! (${effectiveImpostors} Impostor${effectiveImpostors > 1 ? 's' : ''} hidden in the squad — category eyes-only for Host).`
    );

    this.callbacks.onStateChange?.();

    this.phaseTimer = setTimeout(() => {
      this.enterConversationPhase();
    }, revealMs);
  }

  public enterConversationPhase(): void {
    if (this.status !== 'IN_PROGRESS') return;
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    this.phase = 'CONVERSATION';
    this.votes.clear();
    for (const p of this.players.values()) {
      p.readyToVote = false;
      p.hasVoted = false;
      p.votesReceived = 0;
    }

    const conversationMs =
      this.phaseDurationsMs.conversationMs ?? this.settings.conversationSec * 1000;
    const now = Date.now();
    this.phaseStartedAtUtc = now;
    this.phaseDeadlineUtc = now + conversationMs;

    this.appendSystemMessage(
      `Round ${this.roundNumber} Discussion open! Describe the secret subject without giving it away.`
    );
    this.callbacks.onStateChange?.();

    this.phaseTimer = setTimeout(() => {
      this.enterVotingPhase();
    }, conversationMs);
  }

  public setReadyToVote(userId: string, ready: boolean): boolean {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'CONVERSATION') {
      return false;
    }
    const player = this.players.get(userId);
    if (!player || !player.isAlive) return false;

    player.readyToVote = ready;

    if (this.checkAllAliveReadyToVote()) {
      this.appendSystemMessage('All active agents are ready — advancing directly to Vote!');
      this.enterVotingPhase();
      return true;
    }

    this.callbacks.onStateChange?.();
    return true;
  }

  private checkAllAliveReadyToVote(): boolean {
    const alive = Array.from(this.players.values()).filter((p) => p.isAlive);
    if (alive.length === 0) return false;
    const connectedAlive = alive.filter((p) => !p.isDisconnected);
    const pool = connectedAlive.length > 0 ? connectedAlive : alive;
    return pool.every((p) => p.readyToVote);
  }

  public enterVotingPhase(): void {
    if (this.status !== 'IN_PROGRESS') return;
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    this.phase = 'VOTING';
    this.votes.clear();
    for (const p of this.players.values()) {
      p.readyToVote = false;
      p.hasVoted = false;
      p.votesReceived = 0;
    }

    const votingMs = this.phaseDurationsMs.votingMs ?? IMPOSTOR_VOTING_SEC * 1000;
    const now = Date.now();
    this.phaseStartedAtUtc = now;
    this.phaseDeadlineUtc = now + votingMs;

    this.appendSystemMessage('Voting Booths Open — cast your vote or Skip!');
    this.callbacks.onStateChange?.();

    this.phaseTimer = setTimeout(() => {
      this.resolveVotingPhase();
    }, votingMs);
  }

  public castVote(
    voterUserId: string,
    targetUserId: string | 'SKIP'
  ): { ok: boolean; error?: string } {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'VOTING') {
      return { ok: false, error: 'Voting is not currently active.' };
    }
    const voter = this.players.get(voterUserId);
    if (!voter || !voter.isAlive) {
      return { ok: false, error: 'Only active living players may vote.' };
    }

    if (targetUserId !== 'SKIP') {
      const target = this.players.get(targetUserId);
      if (!target || !target.isAlive) {
        return { ok: false, error: 'Cannot vote for an eliminated or missing agent.' };
      }
    }

    this.votes.set(voterUserId, targetUserId);
    voter.hasVoted = true;

    if (this.checkAllAliveVoted()) {
      this.resolveVotingPhase();
      return { ok: true };
    }

    this.callbacks.onStateChange?.();
    return { ok: true };
  }

  private checkAllAliveVoted(): boolean {
    const alive = Array.from(this.players.values()).filter((p) => p.isAlive);
    if (alive.length === 0) return false;
    const connectedAlive = alive.filter((p) => !p.isDisconnected);
    const pool = connectedAlive.length > 0 ? connectedAlive : alive;
    return pool.every((p) => p.hasVoted);
  }

  public resolveVotingPhase(): void {
    if (this.status !== 'IN_PROGRESS' || this.phase !== 'VOTING') return;
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    const voteCounts: Record<string, number> = { SKIP: 0 };
    for (const p of this.players.values()) {
      if (p.isAlive) {
        voteCounts[p.userId] = 0;
      }
    }

    for (const [voterId, targetId] of this.votes.entries()) {
      const voter = this.players.get(voterId);
      if (!voter || !voter.isAlive) continue;
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    for (const p of this.players.values()) {
      p.votesReceived = voteCounts[p.userId] || 0;
    }

    const skipVotes = voteCounts['SKIP'] || 0;
    let topCandidateId: string | null = null;
    let topCandidateVotes = 0;
    let isTieAmongCandidates = false;

    for (const [candidateId, count] of Object.entries(voteCounts)) {
      if (candidateId === 'SKIP') continue;
      if (count > topCandidateVotes) {
        topCandidateVotes = count;
        topCandidateId = candidateId;
        isTieAmongCandidates = false;
      } else if (count === topCandidateVotes && count > 0) {
        isTieAmongCandidates = true;
      }
    }

    let outcome: 'EJECTED' | 'TIE' | 'SKIPPED' = 'SKIPPED';
    let ejectedPlayer: ImpostorPlayerInGame | undefined;
    let ejectedRole: ImpostorRole | undefined;

    if (topCandidateVotes === 0 || skipVotes > topCandidateVotes) {
      outcome = 'SKIPPED';
      this.appendSystemMessage('Vote skipped — nobody was ejected.');
    } else if (isTieAmongCandidates || skipVotes === topCandidateVotes) {
      outcome = 'TIE';
      this.appendSystemMessage('Vote ended in a tie — nobody was ejected.');
    } else if (topCandidateId) {
      const target = this.players.get(topCandidateId);
      if (target) {
        outcome = 'EJECTED';
        target.isAlive = false;
        ejectedRole = this.roles.get(target.userId);
        target.revealedRole = ejectedRole;
        ejectedPlayer = target;
        this.appendSystemMessage(
          ejectedRole === 'IMPOSTOR'
            ? `🚨 ${target.username} was ejected — THEY WERE AN IMPOSTOR!`
            : `💨 ${target.username} was ejected — they were an innocent Crewmate.`
        );
      }
    }

    const remainingImpostors = this.countAliveByRole('IMPOSTOR');

    this.lastEjection = {
      roundNumber: this.roundNumber,
      outcome,
      ejectedUserId: ejectedPlayer?.userId,
      ejectedUsername: ejectedPlayer?.username,
      ejectedRole,
      remainingImpostors,
      voteCounts,
    };

    this.phase = 'EJECTION';
    const ejectionMs =
      this.phaseDurationsMs.ejectionMs ?? IMPOSTOR_EJECTION_SEC * 1000;
    const now = Date.now();
    this.phaseStartedAtUtc = now;
    this.phaseDeadlineUtc = now + ejectionMs;

    this.callbacks.onStateChange?.();

    this.phaseTimer = setTimeout(() => {
      const winner = this.evaluateWinCondition();
      if (winner) {
        this.finishMatch(winner);
      } else {
        this.roundNumber += 1;
        this.enterConversationPhase();
      }
    }, ejectionMs);
  }

  private countAliveByRole(role: ImpostorRole): number {
    let count = 0;
    for (const player of this.players.values()) {
      if (player.isAlive && this.roles.get(player.userId) === role) {
        count += 1;
      }
    }
    return count;
  }

  public evaluateWinCondition(): ImpostorWinnerFaction | null {
    const aliveImpostors = this.countAliveByRole('IMPOSTOR');
    const aliveCrewmates = this.countAliveByRole('CREWMATE');

    if (aliveImpostors === 0) {
      return 'CREWMATES';
    }
    if (aliveImpostors >= aliveCrewmates) {
      return 'IMPOSTORS';
    }
    return null;
  }

  private finishMatch(winnerFaction: ImpostorWinnerFaction): void {
    this.clearTimers();
    this.status = 'FINISHED';
    this.phase = 'FINISHED';
    this.winnerFaction = winnerFaction;
    this.phaseStartedAtUtc = Date.now();
    this.phaseDeadlineUtc = undefined;

    for (const player of this.players.values()) {
      player.revealedRole = this.roles.get(player.userId);
    }

    const finalCategory: ImpostorResolvedCategory =
      this.resolvedCategory ||
      (() => {
        const meta = getImpostorCategoryMeta('FOOD_DRINKS');
        return {
          id: meta.id,
          label: meta.label,
          emoji: meta.emoji,
          difficulty: meta.difficulty,
        };
      })();

    this.appendSystemMessage(
      winnerFaction === 'CREWMATES'
        ? `🏆 CREWMATES WIN! Secret Word was "${this.secretWord}".`
        : `🕶️ IMPOSTORS WIN! Secret Word was "${this.secretWord}".`
    );

    this.callbacks.onStateChange?.();
    this.callbacks.onMatchEnded?.({
      winnerFaction,
      secretWord: this.secretWord,
      impostorHint: this.impostorHint,
      resolvedCategory: finalCategory,
      players: Array.from(this.players.values()).map((p) => ({ ...p })),
    });
  }

  public resetToLobby(): boolean {
    if (this.status !== 'FINISHED' && this.status !== 'ABORTED') return false;
    this.clearTimers();

    this.status = 'WAITING';
    this.phase = undefined;
    this.roundNumber = 0;
    this.phaseStartedAtUtc = undefined;
    this.phaseDeadlineUtc = undefined;
    this.resolvedCategory = undefined;
    this.lastEjection = undefined;
    this.winnerFaction = undefined;
    this.secretWord = '';
    this.impostorHint = '';
    this.roles.clear();
    this.votes.clear();

    for (const player of this.players.values()) {
      player.isAlive = true;
      player.isReady = player.userId === this.hostUserId;
      player.readyToVote = false;
      player.hasVoted = false;
      player.votesReceived = 0;
      player.revealedRole = undefined;
    }

    this.appendSystemMessage('Lobby reset — Host can reconfigure settings for the next round.');
    this.callbacks.onStateChange?.();
    return true;
  }

  /**
   * Generates a strictly role-masked room snapshot tailored for `recipientUserId`.
   * Crewmates NEVER receive `impostorHint` during active play; Impostors NEVER
   * receive `secretWord` during active play. Both unlock at FINISHED.
   */
  public getSummaryForUser(recipientUserId?: string): ImpostorRoomSummary {
    const isFinished = this.status === 'FINISHED';
    const isHost = Boolean(recipientUserId && recipientUserId === this.hostUserId);
    const canSeeCategory = isHost || isFinished;
    const recipientRole = recipientUserId
      ? this.roles.get(recipientUserId)
      : undefined;

    const allImpostorIds = Array.from(this.roles.entries())
      .filter(([, role]) => role === 'IMPOSTOR')
      .map(([id]) => id);

    const maskedPlayers: ImpostorPlayerInGame[] = Array.from(
      this.players.values()
    ).map((p) => ({
      ...p,
      votesReceived:
        this.phase === 'EJECTION' || isFinished ? p.votesReceived : 0,
      revealedRole:
        !p.isAlive || isFinished ? this.roles.get(p.userId) : undefined,
    }));

    let secretWord: string | undefined;
    let impostorHint: string | undefined;
    let assignedWord: string | undefined;
    let allyImpostorIds: string[] | undefined;
    let myRole: ImpostorRole | undefined;

    if (isFinished) {
      myRole = recipientRole;
      secretWord = this.secretWord;
      impostorHint = this.impostorHint;
      allyImpostorIds = allImpostorIds;
    } else if (this.status === 'IN_PROGRESS') {
      if (this.settings.blindMode) {
        // Blind Mode: conceal role & whether assignedWord is Secret Word or One-Word Clue
        myRole = undefined;
        allyImpostorIds = undefined;
        assignedWord =
          recipientRole === 'IMPOSTOR'
            ? this.impostorHint
            : recipientRole === 'CREWMATE'
              ? this.secretWord
              : undefined;
      } else {
        myRole = recipientRole;
        if (recipientRole === 'CREWMATE') {
          secretWord = this.secretWord;
        } else if (recipientRole === 'IMPOSTOR') {
          impostorHint = this.impostorHint;
          allyImpostorIds = allImpostorIds.filter((id) => id !== recipientUserId);
        }
      }
    }

    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      gameType: 'IMPOSTOR',
      mode: this.mode,
      status: this.status,
      hostUserId: this.hostUserId,
      settings: {
        ...this.settings,
        category: canSeeCategory ? this.settings.category : 'CONCEALED',
      },
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      players: maskedPlayers,
      phase: this.phase,
      roundNumber: this.roundNumber,
      phaseStartedAtUtc: this.phaseStartedAtUtc,
      phaseDeadlineUtc: this.phaseDeadlineUtc,
      serverNowUtc: Date.now(),
      resolvedCategory:
        canSeeCategory && this.resolvedCategory
          ? { ...this.resolvedCategory }
          : undefined,
      myRole,
      assignedWord,
      secretWord,
      impostorHint,
      allyImpostorIds,
      myVoteTargetId:
        recipientUserId && this.phase === 'VOTING'
          ? (this.votes.get(recipientUserId) as string | 'SKIP' | undefined)
          : undefined,
      lastEjection: this.lastEjection
        ? {
            ...this.lastEjection,
            voteCounts: { ...this.lastEjection.voteCounts },
          }
        : undefined,
      winnerFaction: this.winnerFaction,
      chatHistory: [...this.chatMessages],
    };
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  public cleanup(): void {
    this.clearTimers();
  }
}
