import { describe, expect, it } from 'vitest';
import { LexiconService } from '@wordchain/lexicon';
import { GameRoom } from '../GameRoom.js';

describe('Player Skills & Tiered Time Attack Engine', () => {
  const p1 = {
    userId: 'user-p1',
    username: 'ScholarOne',
    avatarId: 'avatar_01',
    tier: 'NURSERY' as any,
    division: 1,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  };

  const p2 = {
    userId: 'user-p2',
    username: 'ScholarTwo',
    avatarId: 'avatar_02',
    tier: 'NURSERY' as any,
    division: 1,
    isAlive: true,
    isReady: true,
    wordsSubmitted: 0,
    isDisconnected: false,
  };

  function createTestMatch(): GameRoom {
    LexiconService.getInstance().initialize();
    const room = new GameRoom({
      mode: 'CASUAL',
      language: 'ENGLISH',
      hostUserId: 'user-p1',
      startTimerSec: 15,
      minTimerSec: 5,
    });

    room.addPlayer(p1);
    room.addPlayer(p2);
    room.startMatch();
    return room;
  }

  it('should initialize all players with 2 silence uses and 0 active cooldowns', () => {
    const room = createTestMatch();
    const skills1 = room.getPlayerSkills('user-p1');
    const skills2 = room.getPlayerSkills('user-p2');

    expect(skills1.disableSkillsUsesLeft).toBe(2);
    expect(skills1.changeLetterCooldownSec).toBe(0);
    expect(skills1.burden3LetterCooldownSec).toBe(0);

    expect(skills2.disableSkillsUsesLeft).toBe(2);
  });

  it('should allow active player to use CHANGE_LETTER in 1-letter round, reroll letter, and trigger 10s cooldown', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;
    const initialLetter = room.requiredLetter;

    const res = room.useSkill(activeId, 'CHANGE_LETTER');
    expect(res.success).toBe(true);

    const skills = room.getPlayerSkills(activeId);
    expect(skills.changeLetterCooldownSec).toBeGreaterThanOrEqual(9);

    // Second immediate attempt should fail due to cooldown
    const res2 = room.useSkill(activeId, 'CHANGE_LETTER');
    expect(res2.success).toBe(false);
    expect(res2.reason).toBe('COOLDOWN_ACTIVE');
  });

  it('should simplify 2-letter prefix to 1 single letter when CHANGE_LETTER is used in round 20+', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;

    // Simulate round 20 with a 2-letter prefix e.g. "TH"
    room.roundNumber = 20;
    room.requiredLetter = 'TH';

    const res = room.useSkill(activeId, 'CHANGE_LETTER');
    expect(res.success).toBe(true);

    // Prefix must be reduced to exactly 1 single letter!
    expect(room.requiredLetter.length).toBe(1);
  });

  it('should silence all skills for 10s and decrement uses when DISABLE_SKILLS is triggered', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;
    const inactiveId = room.turnOrder.find((id) => id !== activeId)!;

    // Inactive player uses DISABLE_SKILLS
    const res = room.useSkill(inactiveId, 'DISABLE_SKILLS');
    expect(res.success).toBe(true);

    expect(room.skillsDisabledUntilUtc).toBeGreaterThan(Date.now());
    const skills = room.getPlayerSkills(inactiveId);
    expect(skills.disableSkillsUsesLeft).toBe(1);

    // Active player tries to change letter while silenced -> should be blocked!
    const res2 = room.useSkill(activeId, 'CHANGE_LETTER');
    expect(res2.success).toBe(false);
    expect(res2.reason).toBe('SKILLS_SILENCED');
  });

  it('should apply a 3-letter prefix to next player when BURDEN_3_LETTER is activated', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;
    const nextPlayerId = room.turnOrder.find((id) => id !== activeId)!;

    // Use special 3-letter curse skill
    const res = room.useSkill(activeId, 'BURDEN_3_LETTER');
    expect(res.success).toBe(true);
    expect(room.pendingForcedPrefixLength).toBe(3);
    expect(room.pendingCurseTargetUserId).toBe(nextPlayerId);

    // Active player submits a word e.g. "COMPUTER"
    // Next player must receive a 3-letter prefix (trailing 3 letters or 3-letter fallback)!
    room.requiredLetter = 'C';
    const subRes = room.submitWord(activeId, 'OMPUTER', Date.now());
    expect(subRes.success).toBe(true);

    // Verify next turn has 3-letter required prefix
    expect(room.requiredLetter.length).toBe(3);
    expect(room.getActivePlayerId()).toBe(nextPlayerId);
  });

  it('should apply tiered Time Attack: -2s for 7-9 letter words, -4s for 10+ letter words', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;

    // 1. Submit 7-letter word (e.g. DOLPHIN)
    room.requiredLetter = 'D';
    room.submitWord(activeId, 'OLPHIN', Date.now()); // 7 letters

    // GameRoom should record -2s penalty
    // Since turn advanced, check duration on the new turn
    const activeTurn2 = room.getSummary().turnState!;
    expect(activeTurn2.turnDurationSec).toBe(13); // 15s base - 2s = 13s

    // 2. Submit 10-letter word (e.g. DICTIONARY)
    const nextActiveId = room.getActivePlayerId()!;
    room.requiredLetter = 'D';
    room.submitWord(nextActiveId, 'ICTIONARY', Date.now()); // 10 letters

    // GameRoom should record -4s penalty
    const activeTurn3 = room.getSummary().turnState!;
    expect(activeTurn3.turnDurationSec).toBe(11); // 15s base - 4s = 11s
  });

  it('should allow active player to use PASS_TURN, advance turn to next player without losing a life, and apply 10s cooldown', () => {
    const room = createTestMatch();
    const activeId = room.getActivePlayerId()!;
    const nextPlayerId = room.turnOrder.find((id) => id !== activeId)!;
    const initialLetter = room.requiredLetter;
    const initialLives = room.players.get(activeId)?.lives ?? 3;

    // Inactive player cannot pass
    const invalidRes = room.useSkill(nextPlayerId, 'PASS_TURN');
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.reason).toBe('NOT_YOUR_TURN');

    // Active player uses PASS_TURN
    const res = room.useSkill(activeId, 'PASS_TURN');
    expect(res.success).toBe(true);

    // Active player should not lose a life
    expect(room.players.get(activeId)?.lives).toBe(initialLives);

    // Turn should have advanced to next player
    expect(room.getActivePlayerId()).toBe(nextPlayerId);

    // Letter should be preserved for next player
    expect(room.requiredLetter).toBe(initialLetter);

    // Caster should be on 10s cooldown
    const skills = room.getPlayerSkills(activeId);
    expect(skills.passTurnCooldownSec).toBeGreaterThanOrEqual(9);
  });
});
