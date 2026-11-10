import { AcademicRankTier, PlayerInGame } from '@wordchain/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../../db/index.js';
import {
  matches,
  matchPlayers,
  playerProfiles,
  playerRankProfiles,
  users,
} from '../../../db/schema.js';
import { GameRoom } from '../../../game/GameRoom.js';
import { RankingService } from '../RankingService.js';

describe('Phase 6: Competitive Ranking & Scoring Engine', () => {
  beforeAll(async () => {
    await getDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Placement Rewards & Scoring Matrix', () => {
    it('should award correct base Rank EXP and respect Demotion Protection at Nursery / Kinder', () => {
      // 1st Place: +35 EXP
      const p1 = RankingService.calculatePlacementRewards('NURSERY', 1);
      expect(p1.expChange).toBe(35);
      expect(p1.pointsChange).toBe(0);

      // 2nd Place: +20 EXP
      const p2 = RankingService.calculatePlacementRewards('KINDER', 2);
      expect(p2.expChange).toBe(20);

      // 3rd & 4th: Demotion Protected (0 EXP loss)
      const p3 = RankingService.calculatePlacementRewards('NURSERY', 3);
      expect(p3.expChange).toBe(0);

      const p4 = RankingService.calculatePlacementRewards('KINDER', 4);
      expect(p4.expChange).toBe(0);
    });

    it('should calculate accurate Rank EXP for intermediate tiers (Grader & High School)', () => {
      expect(RankingService.calculatePlacementRewards('GRADER', 1).expChange).toBe(32);
      expect(RankingService.calculatePlacementRewards('GRADER', 2).expChange).toBe(16);
      expect(RankingService.calculatePlacementRewards('HIGH_SCHOOL', 3).expChange).toBe(-6);
      expect(RankingService.calculatePlacementRewards('HIGH_SCHOOL', 4).expChange).toBe(-16);
    });

    it('should calculate accurate Rank EXP for collegiate and honors tiers (Undergrad to Summa)', () => {
      expect(RankingService.calculatePlacementRewards('UNDERGRAD', 1).expChange).toBe(30);
      expect(RankingService.calculatePlacementRewards('CUM_LAUDE', 2).expChange).toBe(12);
      expect(RankingService.calculatePlacementRewards('MAGNA_CUM_LAUDE', 3).expChange).toBe(-10);
      expect(RankingService.calculatePlacementRewards('SUMMA_CUM_LAUDE', 4).expChange).toBe(-20);
    });

    it('should calculate accurate Rank EXP for postgraduate tiers (Masteral & Doctorate)', () => {
      expect(RankingService.calculatePlacementRewards('MASTERAL', 1).expChange).toBe(28);
      expect(RankingService.calculatePlacementRewards('DOCTORATE', 2).expChange).toBe(10);
      expect(RankingService.calculatePlacementRewards('MASTERAL', 3).expChange).toBe(-14);
      expect(RankingService.calculatePlacementRewards('DOCTORATE', 4).expChange).toBe(-26);
    });

    it('should award Scientist Points (SP) instead of EXP at Scientist tier', () => {
      expect(RankingService.calculatePlacementRewards('SCIENTIST', 1)).toEqual({
        expChange: 0,
        pointsChange: 3,
      });
      expect(RankingService.calculatePlacementRewards('SCIENTIST', 2)).toEqual({
        expChange: 0,
        pointsChange: 1,
      });
      expect(RankingService.calculatePlacementRewards('SCIENTIST', 3)).toEqual({
        expChange: 0,
        pointsChange: -1,
      });
      expect(RankingService.calculatePlacementRewards('SCIENTIST', 4)).toEqual({
        expChange: 0,
        pointsChange: -3,
      });
    });

    it('should grant underdog bonuses for lower-MMR scholars', () => {
      // 1st place underdog gets +5 bonus
      const underdogP1 = RankingService.calculatePlacementRewards('GRADER', 1, true);
      expect(underdogP1.expChange).toBe(37); // 32 + 5

      // 4th place underdog has negative loss reduced by 5
      const underdogP4 = RankingService.calculatePlacementRewards('GRADER', 4, true);
      expect(underdogP4.expChange).toBe(-11); // -16 + 5

      // Scientist underdog gets +1 SP bonus
      const underdogSciP1 = RankingService.calculatePlacementRewards('SCIENTIST', 1, true);
      expect(underdogSciP1.pointsChange).toBe(4); // 3 + 1
    });
  });

  describe('2. Division Promotions, Tier Crossings & EXP Overflow', () => {
    it('should handle division promotion within the same tier with EXP overflow', () => {
      // Grader has 75 EXP per division (Divisions IV, III, II, I)
      const current = {
        tier: 'GRADER' as AcademicRankTier,
        division: 2,
        rankExp: 60,
        scientistPoints: 0,
      };

      // Player gains +32 EXP: 60 + 32 = 92 >= 75 -> promotes to Division 1 with 17 EXP
      const delta = RankingService.calculateProgression(current, 32, 0);
      expect(delta.promoted).toBe(true);
      expect(delta.demoted).toBe(false);
      expect(delta.newTier).toBe('GRADER');
      expect(delta.newDivision).toBe(1);
      expect(delta.newExp).toBe(17);
    });

    it('should handle tier promotion crossing into the next tier at Division 4 or 5', () => {
      // Grader Division 1 at 70/75 EXP gains +32 EXP
      const current = {
        tier: 'GRADER' as AcademicRankTier,
        division: 1,
        rankExp: 70,
        scientistPoints: 0,
      };

      // 70 + 32 = 102 >= 75 -> promotes to HIGH_SCHOOL IV with 27 EXP
      const delta = RankingService.calculateProgression(current, 32, 0);
      expect(delta.promoted).toBe(true);
      expect(delta.newTier).toBe('HIGH_SCHOOL');
      expect(delta.newDivision).toBe(4);
      expect(delta.newExp).toBe(27);
    });

    it('should promote Doctorate I into SCIENTIST tier with 0 SP', () => {
      const current = {
        tier: 'DOCTORATE' as AcademicRankTier,
        division: 1,
        rankExp: 90,
        scientistPoints: 0,
      };

      // Doctorate has 100 EXP/div; 90 + 28 = 118 >= 100 -> Promotes to SCIENTIST
      const delta = RankingService.calculateProgression(current, 28, 0);
      expect(delta.promoted).toBe(true);
      expect(delta.newTier).toBe('SCIENTIST');
      expect(delta.newDivision).toBe(0);
      expect(delta.newScientistPoints).toBe(0);
      expect(delta.newExp).toBe(0);
    });
  });

  describe('3. Demotions & Protection Safeguards', () => {
    it('should clamp Nursery III at 0 EXP (Demotion Protection)', () => {
      const current = {
        tier: 'NURSERY' as AcademicRankTier,
        division: 3,
        rankExp: 10,
        scientistPoints: 0,
      };

      const delta = RankingService.calculateProgression(current, -20, 0);
      expect(delta.demoted).toBe(false);
      expect(delta.newTier).toBe('NURSERY');
      expect(delta.newDivision).toBe(3);
      expect(delta.newExp).toBe(0);
    });

    it('should demote division within tier when EXP drops below 0', () => {
      // High School has 75 EXP/div
      const current = {
        tier: 'HIGH_SCHOOL' as AcademicRankTier,
        division: 2,
        rankExp: 10,
        scientistPoints: 0,
      };

      // 10 - 16 = -6 -> Demotes to Division 3 with 75 - 6 = 69 EXP
      const delta = RankingService.calculateProgression(current, -16, 0);
      expect(delta.demoted).toBe(true);
      expect(delta.newTier).toBe('HIGH_SCHOOL');
      expect(delta.newDivision).toBe(3);
      expect(delta.newExp).toBe(69);
    });

    it('should demote from Scientist tier to Doctorate I if SP drops below 0', () => {
      const current = {
        tier: 'SCIENTIST' as AcademicRankTier,
        division: 0,
        rankExp: 0,
        scientistPoints: 1,
      };

      // 1 - 3 = -2 SP -> Demotes to DOCTORATE Division 1 with 80 EXP
      const delta = RankingService.calculateProgression(current, 0, -3);
      expect(delta.demoted).toBe(true);
      expect(delta.newTier).toBe('DOCTORATE');
      expect(delta.newDivision).toBe(1);
      expect(delta.newExp).toBe(80);
      expect(delta.newScientistPoints).toBe(0);
    });
  });

  describe('4. Permanent Account Level & XP Engine', () => {
    it('should calculate Account XP gains correctly based on placement and words submitted', () => {
      // 1st place with 8 words = 100 + (8 * 5) = 140 XP
      expect(RankingService.calculateAccountXpGain(1, 8)).toBe(140);
      // 2nd place with 4 words = 60 + 20 = 80 XP
      expect(RankingService.calculateAccountXpGain(2, 4)).toBe(80);
      // 4th place with 2 words = 20 + 10 = 30 XP
      expect(RankingService.calculateAccountXpGain(4, 2)).toBe(30);
    });

    it('should calculate account level scaling with power formula', () => {
      expect(RankingService.calculateAccountLevel(0).level).toBe(1);
      expect(RankingService.calculateAccountLevel(500).level).toBe(1);
      expect(RankingService.calculateAccountLevel(1400).level).toBe(2);
      expect(RankingService.calculateAccountLevel(2500).level).toBe(3);
    });
  });

  describe('5. Transactional Match Settlement & Idempotency', () => {
    it('should settle a 4-player ranked match and save updates to database', async () => {
      const db = await getDb();

      // Seed 4 test users with profiles
      const testUsers = [
        { id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 's1@wordchain.io', username: 'RankedP1' },
        { id: '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 's2@wordchain.io', username: 'RankedP2' },
        { id: '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 's3@wordchain.io', username: 'RankedP3' },
        { id: '44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 's4@wordchain.io', username: 'RankedP4' },
      ];

      for (const u of testUsers) {
        await db
          .insert(users)
          .values({
            id: u.id,
            email: u.email,
            username: u.username,
            passwordHash: 'hashed',
            emailVerified: true,
          })
          .onConflictDoNothing();

        await db
          .insert(playerProfiles)
          .values({
            userId: u.id,
            totalMatches: 5,
            totalWins: 2,
            lifetimeXp: 500,
          })
          .onConflictDoNothing();
      }

      // Create a simulated 4-player FFA room
      const matchId = '55555555-5555-5555-5555-555555555555';
      const room = new GameRoom({
        roomId: matchId,
        mode: 'RANKED',
        hostUserId: testUsers[0].id,
      });

      // Add players with placements
      const p1: PlayerInGame = {
        userId: testUsers[0].id,
        username: testUsers[0].username,
        avatarId: 'avatar_1',
        tier: 'UNDERGRAD',
        division: 2,
        lives: 3,
        isAlive: true,
        isReady: true,
        wordsSubmitted: 7,
        isDisconnected: false,
        placement: 1,
      };

      const p2: PlayerInGame = {
        userId: testUsers[1].id,
        username: testUsers[1].username,
        avatarId: 'avatar_2',
        tier: 'UNDERGRAD',
        division: 2,
        lives: 0,
        isAlive: false,
        isReady: true,
        wordsSubmitted: 5,
        isDisconnected: false,
        placement: 2,
      };

      const p3: PlayerInGame = {
        userId: testUsers[2].id,
        username: testUsers[2].username,
        avatarId: 'avatar_3',
        tier: 'UNDERGRAD',
        division: 2,
        lives: 0,
        isAlive: false,
        isReady: true,
        wordsSubmitted: 3,
        isDisconnected: false,
        placement: 3,
      };

      const p4: PlayerInGame = {
        userId: testUsers[3].id,
        username: testUsers[3].username,
        avatarId: 'avatar_4',
        tier: 'UNDERGRAD',
        division: 2,
        lives: 0,
        isAlive: false,
        isReady: true,
        wordsSubmitted: 1,
        isDisconnected: false,
        placement: 4,
      };

      room.addPlayer(p1);
      room.addPlayer(p2);
      room.addPlayer(p3);
      room.addPlayer(p4);

      // Settle results
      const deltas = await RankingService.settleMatchResults(matchId, room);

      // Verify deltas
      expect(deltas[testUsers[0].id]).toBeDefined();
      expect(deltas[testUsers[0].id].expChange).toBe(30); // 1st in Undergrad: +30
      expect(deltas[testUsers[1].id].expChange).toBe(12); // 2nd: +12
      expect(deltas[testUsers[2].id].expChange).toBe(-10); // 3rd: -10
      expect(deltas[testUsers[3].id].expChange).toBe(-20); // 4th: -20

      // Verify database records
      const savedMatch = await db.select().from(matches).where(eq(matches.id, matchId));
      expect(savedMatch.length).toBe(1);
      expect(savedMatch[0].status).toBe('COMPLETED');
      expect(savedMatch[0].winnerUserId).toBe(testUsers[0].id);

      // Verify idempotency: calling settle again returns {} without mutating or duplicating
      const secondSettlement = await RankingService.settleMatchResults(matchId, room);
      expect(secondSettlement).toEqual({});
    });
  });

  describe('6. Ranked Eligibility Checking', () => {
    it('should allow users to play ranked without email verification once casual match requirement is met', async () => {
      const db = await getDb();
      const scholarId = '66666666-6666-6666-6666-666666666666';

      await db
        .insert(users)
        .values({
          id: scholarId,
          email: 'scholar@wordchain.io',
          username: 'DirectScholar',
          passwordHash: 'pass',
          emailVerified: false,
        })
        .onConflictDoNothing();

      await db
        .insert(playerProfiles)
        .values({
          userId: scholarId,
          totalMatches: 5,
        })
        .onConflictDoNothing();

      const eligibility = await RankingService.checkRankedEligibility(scholarId);
      expect(eligibility.eligible).toBe(true);
    });

    it('should reject users with fewer than 5 completed matches from playing ranked', async () => {
      const db = await getDb();
      const noviceId = '77777777-7777-7777-7777-777777777777';

      await db
        .insert(users)
        .values({
          id: noviceId,
          email: 'novice@wordchain.io',
          username: 'NoviceScholar',
          passwordHash: 'pass',
          emailVerified: true,
        })
        .onConflictDoNothing();

      await db
        .insert(playerProfiles)
        .values({
          userId: noviceId,
          totalMatches: 3,
        })
        .onConflictDoNothing();

      const eligibility = await RankingService.checkRankedEligibility(noviceId);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('Complete at least 5 casual matches');
    });

    it('should allow verified users with >= 5 completed matches to enter ranked', async () => {
      const db = await getDb();
      const veteranId = '88888888-8888-8888-8888-888888888888';

      await db
        .insert(users)
        .values({
          id: veteranId,
          email: 'veteran@wordchain.io',
          username: 'VeteranScholar',
          passwordHash: 'pass',
          emailVerified: true,
        })
        .onConflictDoNothing();

      await db
        .insert(playerProfiles)
        .values({
          userId: veteranId,
          totalMatches: 10,
        })
        .onConflictDoNothing();

      const eligibility = await RankingService.checkRankedEligibility(veteranId);
      expect(eligibility.eligible).toBe(true);
    });
  });
});
