import { AcademicRankTier } from '@wordchain/shared';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { playerRankProfiles, seasons } from '../../db/schema.js';

export class SeasonTransitionService {
  /**
   * Computes the soft-reset academic tier and division according to the official matrix.
   */
  public static calculateSoftResetTarget(
    tier: AcademicRankTier,
    division: number,
    scientistPoints: number
  ): { targetTier: AcademicRankTier; targetDivision: number } {
    if (tier === 'SCIENTIST') {
      if (scientistPoints >= 100) {
        return { targetTier: 'DOCTORATE', targetDivision: 1 };
      }
      if (scientistPoints >= 50) {
        return { targetTier: 'DOCTORATE', targetDivision: 3 };
      }
      if (scientistPoints >= 25) {
        return { targetTier: 'MASTERAL', targetDivision: 1 };
      }
      return { targetTier: 'MASTERAL', targetDivision: 3 };
    }

    switch (tier) {
      case 'DOCTORATE':
        return { targetTier: 'SUMMA_CUM_LAUDE', targetDivision: 2 };
      case 'MASTERAL':
        return { targetTier: 'MAGNA_CUM_LAUDE', targetDivision: 2 };
      case 'SUMMA_CUM_LAUDE':
        return { targetTier: 'CUM_LAUDE', targetDivision: 3 };
      case 'MAGNA_CUM_LAUDE':
        return { targetTier: 'UNDERGRAD', targetDivision: 1 };
      case 'CUM_LAUDE':
        return { targetTier: 'UNDERGRAD', targetDivision: 3 };
      case 'UNDERGRAD':
        return { targetTier: 'HIGH_SCHOOL', targetDivision: 2 };
      case 'HIGH_SCHOOL':
        return { targetTier: 'GRADER', targetDivision: 3 };
      case 'GRADER':
        return { targetTier: 'KINDER', targetDivision: 1 };
      case 'KINDER':
        return { targetTier: 'KINDER', targetDivision: 3 };
      case 'NURSERY':
      default:
        return { targetTier: 'NURSERY', targetDivision: 3 };
    }
  }

  /**
   * Executes a quarterly season soft-reset:
   * 1. Deactivates the previous season.
   * 2. Inserts and activates the new season.
   * 3. Batch processes all scholars in previous season to compute their target rank & soft-reset MMR.
   * 4. Preserves permanent account levels and historical highest ranks.
   */
  public static async executeSeasonSoftReset(
    fromSeasonId: number,
    nextSeasonNumber: number,
    nextSeasonName: string,
    durationDays: number = 90
  ): Promise<{ newSeasonId: number; affectedScholarsCount: number }> {
    const db = await getDb();

    // 1. Archive previous season
    await db
      .update(seasons)
      .set({ isActive: false })
      .where(eq(seasons.id, fromSeasonId));

    // 2. Create and activate new season
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const insertedSeasons = await db
      .insert(seasons)
      .values({
        seasonNumber: nextSeasonNumber,
        name: nextSeasonName,
        startsAt,
        endsAt,
        isActive: true,
      })
      .returning();

    const newSeason = insertedSeasons[0];
    const newSeasonId = newSeason.id;

    // 3. Query all scholars from previous season
    const previousRanks = await db
      .select()
      .from(playerRankProfiles)
      .where(eq(playerRankProfiles.seasonId, fromSeasonId));

    let affectedCount = 0;

    for (const prev of previousRanks) {
      const { targetTier, targetDivision } = this.calculateSoftResetTarget(
        prev.tier as AcademicRankTier,
        prev.division,
        prev.scientistPoints
      );

      // Soft-reset hidden MMR toward 1000
      const softMmr = Math.round(1000 + (prev.hiddenMmr - 1000) * 0.5);

      await db
        .insert(playerRankProfiles)
        .values({
          userId: prev.userId,
          seasonId: newSeasonId,
          tier: targetTier,
          division: targetDivision,
          rankExp: 0,
          scientistPoints: 0,
          highestTier: prev.highestTier,
          highestScientistPoints: prev.highestScientistPoints,
          hiddenMmr: softMmr,
          seasonMatches: 0,
          seasonWins: 0,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      affectedCount++;
    }

    console.log(
      `[SeasonTransitionService] Season ${nextSeasonNumber} activated (${nextSeasonName}). Soft-reset applied to ${affectedCount} scholars.`
    );

    return { newSeasonId, affectedScholarsCount: affectedCount };
  }
}
