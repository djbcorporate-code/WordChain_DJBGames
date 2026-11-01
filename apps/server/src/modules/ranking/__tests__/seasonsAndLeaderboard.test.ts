import { AcademicRankTier } from '@wordchain/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';
import {
  playerProfiles,
  playerRankProfiles,
  seasons,
  users,
} from '../../../db/schema.js';
import { generateJwt } from '../../../utils/security.js';
import { SeasonTransitionService } from '../SeasonTransitionService.js';

describe('Phase 7: Permanent Progression, Seasons & Global Leaderboards', () => {
  beforeAll(async () => {
    await getDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Quarterly Soft-Reset Target Calculation Matrix', () => {
    it('should map each academic tier accurately according to the soft-reset matrix', () => {
      // Introductory & Primary tiers
      expect(SeasonTransitionService.calculateSoftResetTarget('NURSERY', 1, 0)).toEqual({
        targetTier: 'NURSERY',
        targetDivision: 3,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('KINDER', 1, 0)).toEqual({
        targetTier: 'KINDER',
        targetDivision: 3,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('GRADER', 1, 0)).toEqual({
        targetTier: 'KINDER',
        targetDivision: 1,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('HIGH_SCHOOL', 2, 0)).toEqual({
        targetTier: 'GRADER',
        targetDivision: 3,
      });

      // Collegiate & Honors tiers
      expect(SeasonTransitionService.calculateSoftResetTarget('UNDERGRAD', 1, 0)).toEqual({
        targetTier: 'HIGH_SCHOOL',
        targetDivision: 2,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('CUM_LAUDE', 1, 0)).toEqual({
        targetTier: 'UNDERGRAD',
        targetDivision: 3,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('MAGNA_CUM_LAUDE', 2, 0)).toEqual({
        targetTier: 'UNDERGRAD',
        targetDivision: 1,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('SUMMA_CUM_LAUDE', 1, 0)).toEqual({
        targetTier: 'CUM_LAUDE',
        targetDivision: 3,
      });

      // Postgraduate & Terminal tiers
      expect(SeasonTransitionService.calculateSoftResetTarget('MASTERAL', 3, 0)).toEqual({
        targetTier: 'MAGNA_CUM_LAUDE',
        targetDivision: 2,
      });
      expect(SeasonTransitionService.calculateSoftResetTarget('DOCTORATE', 1, 0)).toEqual({
        targetTier: 'SUMMA_CUM_LAUDE',
        targetDivision: 2,
      });

      // Scientist System distinctions (SP-based)
      // Scientist (0-24 SP) -> Masteral III
      expect(SeasonTransitionService.calculateSoftResetTarget('SCIENTIST', 0, 15)).toEqual({
        targetTier: 'MASTERAL',
        targetDivision: 3,
      });
      // Lead Scientist (25-49 SP) -> Masteral I
      expect(SeasonTransitionService.calculateSoftResetTarget('SCIENTIST', 0, 30)).toEqual({
        targetTier: 'MASTERAL',
        targetDivision: 1,
      });
      // Principal Scientist (50-99 SP) -> Doctorate III
      expect(SeasonTransitionService.calculateSoftResetTarget('SCIENTIST', 0, 75)).toEqual({
        targetTier: 'DOCTORATE',
        targetDivision: 3,
      });
      // Chief Scientist (100+ SP) -> Doctorate I
      expect(SeasonTransitionService.calculateSoftResetTarget('SCIENTIST', 0, 140)).toEqual({
        targetTier: 'DOCTORATE',
        targetDivision: 1,
      });
    });
  });

  describe('2. Transactional Season Soft-Reset Execution', () => {
    it('should transition to a new season, archive the old season, and soft-reset scholar ranks', async () => {
      const db = await getDb();

      // Ensure active Season 1
      const activeSeasons = await db
        .select()
        .from(seasons)
        .where(eq(seasons.isActive, true))
        .limit(1);

      const season1Id = activeSeasons[0].id;

      // Seed a Scientist and a Doctorate scholar in Season 1
      const scholarA = 'aaaa1111-1111-1111-1111-111111111111';
      const scholarB = 'bbbb2222-2222-2222-2222-222222222222';

      await db
        .insert(users)
        .values([
          {
            id: scholarA,
            email: 'season_sci@wordchain.io',
            username: 'ChiefScientistAlice',
            passwordHash: 'hash',
            emailVerified: true,
          },
          {
            id: scholarB,
            email: 'season_doc@wordchain.io',
            username: 'DoctorateBob',
            passwordHash: 'hash',
            emailVerified: true,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(playerProfiles)
        .values([
          {
            userId: scholarA,
            accountLevel: 25,
            lifetimeXp: 15000,
            totalMatches: 60,
            totalWins: 45,
          },
          {
            userId: scholarB,
            accountLevel: 12,
            lifetimeXp: 6000,
            totalMatches: 30,
            totalWins: 18,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(playerRankProfiles)
        .values([
          {
            userId: scholarA,
            seasonId: season1Id,
            tier: 'SCIENTIST',
            division: 0,
            rankExp: 0,
            scientistPoints: 120, // Chief Scientist
            highestTier: 'SCIENTIST',
            highestScientistPoints: 120,
            hiddenMmr: 1600,
          },
          {
            userId: scholarB,
            seasonId: season1Id,
            tier: 'DOCTORATE',
            division: 1,
            rankExp: 60,
            scientistPoints: 0,
            highestTier: 'DOCTORATE',
            highestScientistPoints: 0,
            hiddenMmr: 1300,
          },
        ])
        .onConflictDoNothing();

      // Execute Season Reset to Season 2
      const result = await SeasonTransitionService.executeSeasonSoftReset(
        season1Id,
        2,
        'Season 2: Continental Scholastics'
      );

      expect(result.newSeasonId).toBeGreaterThan(season1Id);
      expect(result.affectedScholarsCount).toBeGreaterThanOrEqual(2);

      // Verify Season 1 is now inactive
      const oldSeason = await db.select().from(seasons).where(eq(seasons.id, season1Id));
      expect(oldSeason[0].isActive).toBe(false);

      // Verify Season 2 is active
      const newSeason = await db.select().from(seasons).where(eq(seasons.id, result.newSeasonId));
      expect(newSeason[0].isActive).toBe(true);
      expect(newSeason[0].name).toBe('Season 2: Continental Scholastics');

      // Verify Chief Scientist Alice soft reset to Doctorate I with 0 SP
      const aliceNewRank = await db
        .select()
        .from(playerRankProfiles)
        .where(
          eq(playerRankProfiles.userId, scholarA)
        );

      const aliceS2 = aliceNewRank.find((r) => r.seasonId === result.newSeasonId);
      expect(aliceS2).toBeDefined();
      expect(aliceS2?.tier).toBe('DOCTORATE');
      expect(aliceS2?.division).toBe(1);
      expect(aliceS2?.scientistPoints).toBe(0);
      expect(aliceS2?.highestTier).toBe('SCIENTIST'); // Highest rank preserved!
      expect(aliceS2?.highestScientistPoints).toBe(120);

      // Soft MMR calculation: 1000 + (1600 - 1000) * 0.5 = 1300
      expect(aliceS2?.hiddenMmr).toBe(1300);

      // Verify permanent account profile was completely untouched
      const aliceProfile = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, scholarA));

      expect(aliceProfile[0].accountLevel).toBe(25);
      expect(aliceProfile[0].lifetimeXp).toBe(15000);
      expect(aliceProfile[0].totalWins).toBe(45);
    });
  });

  describe('3. Global Leaderboards REST API (GET /api/v1/leaderboards)', () => {
    it('should return seasonal standings with top scholars by rank and Scientist Points', async () => {
      const res = await request(app).get('/api/v1/leaderboards?type=SEASONAL&page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.entries).toBeInstanceOf(Array);
      expect(res.body.totalScholars).toBeGreaterThan(0);
      expect(res.body.entries[0].rank).toBe(1);
      expect(res.body.entries[0].username).toBeDefined();
    });

    it('should return scholars ranked by lifetime wins (type=LIFETIME_WINS)', async () => {
      const res = await request(app).get('/api/v1/leaderboards?type=LIFETIME_WINS&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const entries = res.body.entries;
      expect(entries.length).toBeGreaterThan(0);

      // Verify descending order of totalWins
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].totalWins).toBeGreaterThanOrEqual(entries[i + 1].totalWins);
      }
    });

    it('should return scholars ranked by account level / lifetime XP (type=ACCOUNT_LEVEL)', async () => {
      const res = await request(app).get('/api/v1/leaderboards?type=ACCOUNT_LEVEL&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.entries.length).toBeGreaterThan(0);
    });
  });

  describe('4. Public Scholar Profile & Cosmetics Locker', () => {
    it('should retrieve a full public profile by username', async () => {
      const res = await request(app).get('/api/v1/profile/chiefscientistalice');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.username).toBe('ChiefScientistAlice');
      expect(res.body.profile.accountLevel).toBe(25);
      expect(res.body.profile.totalWins).toBe(45);
      expect(res.body.profile.winRate).toBe(75); // 45 / 60 = 75%
      expect(res.body.profile.highestRank.highestTier).toBe('SCIENTIST');
    });

    it('should reject avatar unlock if account level is insufficient', async () => {
      // Alice is level 25. Avatar 'avatar_quantum_50' requires level 50.
      const aliceToken = generateJwt({
        userId: 'aaaa1111-1111-1111-1111-111111111111',
        username: 'ChiefScientistAlice',
        role: 'USER',
        emailVerified: true,
      });

      const res = await request(app)
        .patch('/api/v1/profile/avatar')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ avatarId: 'avatar_quantum_50' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('requires Account Level 50');
    });

    it('should allow avatar update when scholar meets the required account level', async () => {
      // Alice is level 25. Avatar 'avatar_master_20' requires level 20.
      const aliceToken = generateJwt({
        userId: 'aaaa1111-1111-1111-1111-111111111111',
        username: 'ChiefScientistAlice',
        role: 'USER',
        emailVerified: true,
      });

      const res = await request(app)
        .patch('/api/v1/profile/avatar')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ avatarId: 'avatar_master_20' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.avatarId).toBe('avatar_master_20');
    });
  });
});
