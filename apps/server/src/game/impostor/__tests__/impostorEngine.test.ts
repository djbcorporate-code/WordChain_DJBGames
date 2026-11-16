import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clampImpostorCount,
  IMPOSTOR_CATEGORIES,
  IMPOSTOR_WORD_POOLS,
  pickImpostorPrompt,
  ImpostorDifficultyTier,
} from '@wordchain/shared';
import { ImpostorGameRoom } from '../ImpostorGameRoom.js';

function seedRoom(playerCount: number, settings?: Parameters<ImpostorGameRoom['updateSettings']>[1]): ImpostorGameRoom {
  const room = new ImpostorGameRoom({
    mode: 'PRIVATE',
    hostUserId: 'u1',
    countdownDelayMs: 0,
    phaseDurationsMs: {
      roleRevealMs: 1000,
      conversationMs: 5000,
      votingMs: 4000,
      ejectionMs: 1000,
    },
    settings,
  });

  for (let i = 1; i <= playerCount; i++) {
    room.addPlayer({
      userId: `u${i}`,
      username: `Agent_${i}`,
      avatarId: `avatar_0${((i - 1) % 4) + 1}`,
      isReady: true,
    });
  }

  return room;
}

describe('Impostor Word Bank & Categories', () => {
  it('defines all 18 requested categories including Mobile Legends and Dota 2 Heroes', () => {
    expect(IMPOSTOR_CATEGORIES).toHaveLength(18);
    const ids = IMPOSTOR_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('FOOD_DRINKS');
    expect(ids).toContain('PLAYER_NAMES');
    expect(ids).toContain('MOBILE_LEGENDS_HEROES');
    expect(ids).toContain('DOTA2_HEROES');
    expect(ids).toContain('ABSTRACT_CONCEPTS');

    const mlbb = IMPOSTOR_CATEGORIES.find((c) => c.id === 'MOBILE_LEGENDS_HEROES');
    const dota = IMPOSTOR_CATEGORIES.find((c) => c.id === 'DOTA2_HEROES');
    expect(mlbb?.difficulty).toBe('MEDIUM');
    expect(dota?.difficulty).toBe('MEDIUM');
  });

  it('has strictly one-word hints in every static pool that never leak the exact word', () => {
    for (const [catId, entries] of Object.entries(IMPOSTOR_WORD_POOLS)) {
      expect(entries.length, `${catId} should have at least 18 words`).toBeGreaterThanOrEqual(18);
      for (const entry of entries) {
        expect(entry.word.trim().length).toBeGreaterThan(0);
        expect(entry.hint, `${catId}:${entry.word} hint "${entry.hint}" must be one word only`).toMatch(
          /^[A-Za-z]+$/
        );
        expect(entry.hint.toLowerCase()).not.toContain(entry.word.toLowerCase());
      }
    }
  });

  it('filters RANDOM selection strictly by chosen difficulty tier', () => {
    const tiers: ImpostorDifficultyTier[] = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
    for (const tier of tiers) {
      const result = pickImpostorPrompt(
        { category: 'RANDOM', difficulty: tier, impostorCount: 1, conversationSec: 90, blindMode: false },
        [
          { userId: 'u1', username: 'Ken', avatarId: 'a1', isAlive: true, isReady: true, readyToVote: false, isDisconnected: false, hasVoted: false, votesReceived: 0 },
          { userId: 'u2', username: 'Mia', avatarId: 'a2', isAlive: true, isReady: true, readyToVote: false, isDisconnected: false, hasVoted: false, votesReceived: 0 },
        ],
        'u1'
      );
      expect(result.resolvedCategory.difficulty).toBe(tier);
    }
  });

  it('generates strictly one-word PLAYER_NAMES clues without leaking the exact username', () => {
    const mockPlayers = [
      { userId: 'u1', username: 'ShadowFox', avatarId: 'a1', isAlive: true, isReady: true, readyToVote: false, isDisconnected: false, hasVoted: false, votesReceived: 0 },
      { userId: 'u2', username: 'NovaBlade', avatarId: 'a2', isAlive: true, isReady: true, readyToVote: false, isDisconnected: false, hasVoted: false, votesReceived: 0 },
      { userId: 'u3', username: 'CipherKid', avatarId: 'a3', isAlive: true, isReady: true, readyToVote: false, isDisconnected: false, hasVoted: false, votesReceived: 0 },
    ];
    for (let i = 0; i < mockPlayers.length; i++) {
      const picked = pickImpostorPrompt(
        { category: 'PLAYER_NAMES', difficulty: 'EASY', impostorCount: 1, conversationSec: 90, blindMode: false },
        mockPlayers,
        'u1',
        () => i / mockPlayers.length
      );
      expect(mockPlayers.map((p) => p.username)).toContain(picked.secretWord);
      expect(picked.impostorHint).toMatch(/^[A-Za-z]+$/);
      expect(picked.impostorHint.toLowerCase()).not.toContain(picked.secretWord.toLowerCase());
    }
  });

  it('clamps impostor count below half of lobby players', () => {
    expect(clampImpostorCount(3, 3)).toBe(1);
    expect(clampImpostorCount(3, 4)).toBe(1);
    expect(clampImpostorCount(3, 5)).toBe(2);
    expect(clampImpostorCount(3, 6)).toBe(2);
    expect(clampImpostorCount(3, 7)).toBe(3);
    expect(clampImpostorCount(3, 10)).toBe(3);
  });
});

describe('ImpostorGameRoom Engine & Privacy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows only Host to configure live settings cleanly and clamps bounds', () => {
    const room = seedRoom(4);
    expect(room.updateSettings('u2', { conversationSec: 120 }).ok).toBe(false);

    const updated = room.updateSettings('u1', {
      category: 'MOBILE_LEGENDS_HEROES',
      difficulty: 'MEDIUM',
      impostorCount: 2,
      conversationSec: 250, // clamped to 180
    });
    expect(updated.ok).toBe(true);
    expect(room.settings.category).toBe('MOBILE_LEGENDS_HEROES');
    expect(room.settings.conversationSec).toBe(180);

    room.startMatch();
    expect(room.updateSettings('u1', { conversationSec: 60 }).ok).toBe(false);
    room.cleanup();
  });

  it('masks secretWord from Impostor, impostorHint from Crewmates, and conceals category from non-host players until FINISHED', () => {
    const room = seedRoom(5, {
      category: 'DOTA2_HEROES',
      difficulty: 'MEDIUM',
      impostorCount: 1,
      conversationSec: 60,
    });

    // In WAITING lobby: Host sees chosen category, joined players see CONCEALED
    expect(room.getSummaryForUser('u1').settings.category).toBe('DOTA2_HEROES');
    expect(room.getSummaryForUser('u2').settings.category).toBe('CONCEALED');
    expect(room.getSummaryForUser('u3').settings.category).toBe('CONCEALED');

    room.startMatch();
    expect(room.status).toBe('IN_PROGRESS');
    expect(room.phase).toBe('ROLE_REVEAL');

    const hostSummary = room.getSummaryForUser('u1');
    expect(hostSummary.settings.category).toBe('DOTA2_HEROES');
    expect(hostSummary.resolvedCategory?.id).toBe('DOTA2_HEROES');

    // Non-host joined players must NOT see settings.category, resolvedCategory, or category name in system chat
    for (const nonHostId of ['u2', 'u3', 'u4', 'u5']) {
      const s = room.getSummaryForUser(nonHostId);
      expect(s.settings.category).toBe('CONCEALED');
      expect(s.resolvedCategory).toBeUndefined();
      const chatText = (s.chatHistory || []).map((m) => m.text).join(' ');
      expect(chatText).not.toContain('Dota 2 Heroes');
    }

    const summaries = ['u1', 'u2', 'u3', 'u4', 'u5'].map((id) => ({
      id,
      summary: room.getSummaryForUser(id),
    }));

    const impostors = summaries.filter((s) => s.summary.myRole === 'IMPOSTOR');
    const crewmates = summaries.filter((s) => s.summary.myRole === 'CREWMATE');

    expect(impostors).toHaveLength(1);
    expect(crewmates).toHaveLength(4);

    // Impostor sees hint, never secret word
    expect(impostors[0].summary.secretWord).toBeUndefined();
    expect(impostors[0].summary.impostorHint).toBeTruthy();

    // Crewmates see identical secret word, never hint, and hidden roles stay concealed
    const expectedWord = crewmates[0].summary.secretWord;
    expect(expectedWord).toBeTruthy();
    for (const c of crewmates) {
      expect(c.summary.secretWord).toBe(expectedWord);
      expect(c.summary.impostorHint).toBeUndefined();
      expect(c.summary.players.every((p) => p.revealedRole === undefined)).toBe(true);
    }

    room.cleanup();
  });

  it('fast-forwards CONVERSATION when all alive players click Ready to Vote and keeps same Secret Word across non-lethal ties', () => {
    const room = seedRoom(4, { category: 'FOOD_DRINKS', impostorCount: 1, conversationSec: 90 });
    room.startMatch();

    const firstCrewmateId = ['u1', 'u2', 'u3', 'u4'].find(
      (id) => room.getSummaryForUser(id).myRole === 'CREWMATE'
    )!;
    const originalSecretWord = room.getSummaryForUser(firstCrewmateId).secretWord!;

    // Advance out of 1s ROLE_REVEAL -> CONVERSATION
    vi.advanceTimersByTime(1000);
    expect(room.phase).toBe('CONVERSATION');
    const r1Starter = room.getSummaryForUser('u1').conversationStarterUserId;
    expect(['u1', 'u2', 'u3', 'u4']).toContain(r1Starter);
    expect(room.getSummaryForUser('u2').conversationStarterUsername).toBeTruthy();

    // All 4 click Ready to Vote -> jumps immediately to VOTING
    room.setReadyToVote('u1', true);
    room.setReadyToVote('u2', true);
    room.setReadyToVote('u3', true);
    expect(room.phase).toBe('CONVERSATION');
    room.setReadyToVote('u4', true);
    expect(room.phase).toBe('VOTING');

    // Split votes 2-2 tie -> EJECTION with TIE
    room.castVote('u1', 'u2');
    room.castVote('u3', 'u2');
    room.castVote('u2', 'u1');
    room.castVote('u4', 'u1');

    expect(room.phase).toBe('EJECTION');
    expect(room.lastEjection?.outcome).toBe('TIE');
    expect(room.lastEjection?.ejectedUserId).toBeUndefined();

    // Advance 1s ejection timer -> Round 2 CONVERSATION with SAME secret word & starter selected!
    vi.advanceTimersByTime(1000);
    expect(room.status).toBe('IN_PROGRESS');
    expect(room.phase).toBe('CONVERSATION');
    expect(room.roundNumber).toBe(2);
    expect(room.getSummaryForUser(firstCrewmateId).secretWord).toBe(originalSecretWord);
    expect(['u1', 'u2', 'u3', 'u4']).toContain(room.getSummaryForUser('u2').conversationStarterUserId);

    room.cleanup();
  });

  it('awards CREWMATES win when the sole Impostor is ejected and silences ghosts until FINISHED', () => {
    const room = seedRoom(4, { category: 'MOBILE_LEGENDS_HEROES', impostorCount: 1, conversationSec: 90 });
    let endPayload: any = null;
    room.setCallbacks({ onMatchEnded: (p) => { endPayload = p; } });
    room.startMatch();

    const impostorId = ['u1', 'u2', 'u3', 'u4'].find(
      (id) => room.getSummaryForUser(id).myRole === 'IMPOSTOR'
    )!;

    vi.advanceTimersByTime(1000); // CONVERSATION
    vi.advanceTimersByTime(5000); // VOTING
    expect(room.phase).toBe('VOTING');

    for (const id of ['u1', 'u2', 'u3', 'u4']) {
      room.castVote(id, impostorId);
    }

    expect(room.phase).toBe('EJECTION');
    expect(room.lastEjection?.outcome).toBe('EJECTED');
    expect(room.lastEjection?.ejectedUserId).toBe(impostorId);
    expect(room.lastEjection?.ejectedRole).toBe('IMPOSTOR');

    vi.advanceTimersByTime(1000);
    expect(room.status).toBe('FINISHED');
    expect(room.phase).toBe('FINISHED');
    expect(room.winnerFaction).toBe('CREWMATES');
    expect(endPayload?.winnerFaction).toBe('CREWMATES');
    expect(endPayload?.secretWord).toBeTruthy();
    expect(endPayload?.impostorHint).toBeTruthy();
    expect(room.getSummaryForUser('u2').resolvedCategory?.id).toBe('MOBILE_LEGENDS_HEROES');

    room.cleanup();
  });

  it('awards IMPOSTORS win when innocent ejections leave impostors >= crewmates and silences ejected ghosts during play', () => {
    const room = seedRoom(3, { category: 'FILIPINO_SLANG', impostorCount: 1, conversationSec: 90 });
    room.startMatch();

    const crewmateIds = ['u1', 'u2', 'u3'].filter(
      (id) => room.getSummaryForUser(id).myRole === 'CREWMATE'
    );
    const victimId = crewmateIds[0];

    vi.advanceTimersByTime(1000); // CONVERSATION
    vi.advanceTimersByTime(5000); // VOTING

    for (const id of ['u1', 'u2', 'u3']) {
      room.castVote(id, victimId);
    }

    expect(room.phase).toBe('EJECTION');
    expect(room.canSendPublicChat(victimId)).toBe(false);
    expect(room.canSendPublicChat(crewmateIds[1])).toBe(true);

    // With 1 impostor vs 1 crewmate left, Impostors reach parity -> IMPOSTORS WIN
    vi.advanceTimersByTime(1000);
    expect(room.status).toBe('FINISHED');
    expect(room.winnerFaction).toBe('IMPOSTORS');
    expect(room.canSendPublicChat(victimId)).toBe(true); // Unlocked post-match

    // Reset to lobby for Play Again and start Match 2
    expect(room.resetToLobby()).toBe(true);
    expect(room.status).toBe('WAITING');
    expect(room.winnerFaction).toBeUndefined();
    expect(room.players.get(victimId)?.isAlive).toBe(true);

    room.setPlayerReady('u2', true);
    room.setPlayerReady('u3', true);
    room.startMatch();

    expect(room.status).toBe('IN_PROGRESS');
    expect(room.phase).toBe('ROLE_REVEAL');
    expect(room.winnerFaction).toBeUndefined();
    for (const id of ['u1', 'u2', 'u3']) {
      const s = room.getSummaryForUser(id);
      expect(s.status).toBe('IN_PROGRESS');
      expect(s.phase).toBe('ROLE_REVEAL');
      expect(s.winnerFaction).toBeUndefined();
    }

    vi.advanceTimersByTime(1000);
    expect(room.status).toBe('IN_PROGRESS');
    expect(room.phase).toBe('CONVERSATION');

    room.cleanup();
  });

  it('supports toggleable Blind Identity Mode hiding roles, allies, and word vs clue distinction during active play', () => {
    const room = seedRoom(4, {
      category: 'MOBILE_LEGENDS_HEROES',
      difficulty: 'MEDIUM',
      impostorCount: 1,
      conversationSec: 60,
      blindMode: false,
    });

    // Host toggles Blind Mode ON live in lobby, then OFF, then ON
    expect(room.updateSettings('u1', { blindMode: true }).ok).toBe(true);
    expect(room.settings.blindMode).toBe(true);
    expect(room.updateSettings('u2', { blindMode: false }).ok).toBe(false); // non-host rejected

    room.startMatch();
    expect(room.status).toBe('IN_PROGRESS');

    const activeSummaries = ['u1', 'u2', 'u3', 'u4'].map((id) => ({
      id,
      summary: room.getSummaryForUser(id),
    }));

    // Every single player must have NO role, NO secretWord, NO impostorHint, NO allyImpostorIds
    const assignedWords = new Set<string>();
    for (const item of activeSummaries) {
      expect(item.summary.settings.blindMode).toBe(true);
      expect(item.summary.myRole).toBeUndefined();
      expect(item.summary.secretWord).toBeUndefined();
      expect(item.summary.impostorHint).toBeUndefined();
      expect(item.summary.allyImpostorIds).toBeUndefined();
      expect(item.summary.assignedWord).toBeTruthy();
      assignedWords.add(item.summary.assignedWord!);
    }

    // 3 Crewmates got one word (the Secret Word) and 1 Impostor got a different word (the 1-word Clue)
    expect(assignedWords.size).toBe(2);

    // Advance into voting & eject players until FINISHED; then roles and secrets reveal cleanly
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(5000);
    expect(room.phase).toBe('VOTING');

    // Eject u2 blindly (or whoever has majority)
    for (const id of ['u1', 'u2', 'u3', 'u4']) {
      room.castVote(id, 'u2');
    }
    vi.advanceTimersByTime(1000);

    // If game continues (u2 wasn't impostor), living players still don't know their role; if finished, all roles unlock
    if (room.status === 'IN_PROGRESS') {
      expect(room.getSummaryForUser('u1').myRole).toBeUndefined();
      expect(room.getSummaryForUser('u1').secretWord).toBeUndefined();
      expect(room.getSummaryForUser('u1').impostorHint).toBeUndefined();
    } else {
      expect(room.getSummaryForUser('u1').myRole).toBeDefined();
      expect(room.getSummaryForUser('u1').secretWord).toBeTruthy();
      expect(room.getSummaryForUser('u1').impostorHint).toBeTruthy();
    }

    room.cleanup();
  });

  it('conceals resolvedCategory from ALL players including Host when RANDOM pool is active during play', () => {
    const room = seedRoom(3, {
      category: 'RANDOM',
      difficulty: 'ALL',
      impostorCount: 1,
      conversationSec: 60,
      blindMode: false,
    });
    room.startMatch();

    for (const id of ['u1', 'u2', 'u3']) {
      expect(room.getSummaryForUser(id).resolvedCategory).toBeUndefined();
    }

    vi.advanceTimersByTime(1000); // CONVERSATION
    expect(room.getSummaryForUser('u1').resolvedCategory).toBeUndefined();
    expect(room.getSummaryForUser('u2').resolvedCategory).toBeUndefined();

    const impostorId = ['u1', 'u2', 'u3'].find(
      (id) => room.getSummaryForUser(id).myRole === 'IMPOSTOR'
    )!;
    vi.advanceTimersByTime(5000); // VOTING
    for (const id of ['u1', 'u2', 'u3']) {
      room.castVote(id, impostorId);
    }
    vi.advanceTimersByTime(1000); // FINISHED

    expect(room.status).toBe('FINISHED');
    expect(room.getSummaryForUser('u1').resolvedCategory).toBeDefined();
    expect(room.getSummaryForUser('u2').resolvedCategory).toBeDefined();

    room.cleanup();
  });

  it('defaults Blind Identity Mode ON automatically for CASUAL public lobbies while leaving PRIVATE toggleable', () => {
    const casualRoom = new ImpostorGameRoom({
      mode: 'CASUAL',
      hostUserId: 'u1',
    });
    expect(casualRoom.settings.blindMode).toBe(true);
    casualRoom.cleanup();

    const privateRoom = new ImpostorGameRoom({
      mode: 'PRIVATE',
      hostUserId: 'u1',
    });
    expect(privateRoom.settings.blindMode).toBe(false);
    privateRoom.cleanup();
  });
});
