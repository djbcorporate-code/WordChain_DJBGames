import {
  ACADEMIC_RANK_TIERS,
  AcademicRankTier,
} from '@wordchain/shared';
import { and, desc, eq } from 'drizzle-orm';
import express from 'express';
import { getDb } from '../../db/index.js';
import {
  playerProfiles,
  playerRankProfiles,
  seasons,
  users,
} from '../../db/schema.js';

const router = express.Router();

/**
 * GET /api/v1/leaderboards
 * Retrieves paginated global & seasonal leaderboards.
 * Query params: type = 'SEASONAL' | 'LIFETIME_WINS' | 'ACCOUNT_LEVEL'
 *              page = 1, limit = 20
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const type = (req.query.type as string) || 'SEASONAL';
    const gameType = req.query.gameType === 'MATHRACE' ? 'MATHRACE' : 'WORDCHAIN';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit as string, 10) || 20));

    // 1. Fetch active season
    const activeSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);

    const activeSeason = activeSeasons[0] || { id: 1, name: 'Season 1' };

    // 2. Fetch records
    const rawScholars = await db
      .select({
        userId: users.id,
        username: users.username,
        avatarId: playerProfiles.avatarId,
        accountLevel: playerProfiles.accountLevel,
        lifetimeXp: playerProfiles.lifetimeXp,
        totalMatches: playerProfiles.totalMatches,
        totalWins: playerProfiles.totalWins,
        tier: playerRankProfiles.tier,
        division: playerRankProfiles.division,
        rankExp: playerRankProfiles.rankExp,
        scientistPoints: playerRankProfiles.scientistPoints,
        hiddenMmr: playerRankProfiles.hiddenMmr,
      })
      .from(users)
      .innerJoin(playerProfiles, eq(users.id, playerProfiles.userId))
      .leftJoin(
        playerRankProfiles,
        and(
          eq(users.id, playerRankProfiles.userId),
          eq(playerRankProfiles.seasonId, activeSeason.id),
          eq(playerRankProfiles.gameType, gameType)
        )
      );

    // 3. Sort according to requested leaderboard type
    let sorted = [...rawScholars];

    if (type === 'LIFETIME_WINS') {
      sorted.sort((a, b) => b.totalWins - a.totalWins);
    } else if (type === 'ACCOUNT_LEVEL') {
      sorted.sort((a, b) => b.lifetimeXp - a.lifetimeXp);
    } else {
      // SEASONAL (Academic Standing)
      sorted.sort((a, b) => {
        const tierIdxA = ACADEMIC_RANK_TIERS.indexOf(
          (a.tier as AcademicRankTier) || 'NURSERY'
        );
        const tierIdxB = ACADEMIC_RANK_TIERS.indexOf(
          (b.tier as AcademicRankTier) || 'NURSERY'
        );

        if (tierIdxA !== tierIdxB) {
          return tierIdxB - tierIdxA; // Higher tier first
        }

        // Same tier
        if ((a.tier as AcademicRankTier) === 'SCIENTIST') {
          return (b.scientistPoints || 0) - (a.scientistPoints || 0);
        }

        // Non-scientist: Lower division is better (1 > 2 > 3)
        if ((a.division || 3) !== (b.division || 3)) {
          return (a.division || 3) - (b.division || 3);
        }

        // Same division: higher EXP first
        return (b.rankExp || 0) - (a.rankExp || 0);
      });
    }

    const totalScholars = sorted.length;
    const startIndex = (page - 1) * limit;
    const paginated = sorted.slice(startIndex, startIndex + limit);

    const entries = paginated.map((s, idx) => {
      const rank = startIndex + idx + 1;
      const totalMatches = s.totalMatches || 0;
      const totalWins = s.totalWins || 0;
      const winRate =
        totalMatches > 0
          ? Math.round((totalWins / totalMatches) * 1000) / 10
          : 0;

      return {
        rank,
        userId: s.userId,
        username: s.username,
        avatarId: s.avatarId || 'avatar_default_01',
        accountLevel: s.accountLevel || 1,
        tier: (s.tier as AcademicRankTier) || 'NURSERY',
        division: s.division ?? 3,
        rankExp: s.rankExp ?? 0,
        scientistPoints: s.scientistPoints ?? 0,
        totalMatches,
        totalWins,
        winRate,
      };
    });

    res.status(200).json({
      success: true,
      type,
      gameType,
      season: {
        id: activeSeason.id,
        name: activeSeason.name,
      },
      page,
      limit,
      totalScholars,
      totalPages: Math.ceil(totalScholars / limit) || 1,
      entries,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
