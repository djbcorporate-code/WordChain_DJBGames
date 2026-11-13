import {
  AcademicRankTier,
  COSMETIC_AVATARS,
  RANK_TIER_CONFIGS,
} from '@wordchain/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  matches,
  matchPlayers,
  playerProfiles,
  playerRankProfiles,
  seasons,
  users,
} from '../../db/schema.js';

export class ProfileService {
  /**
   * Retrieves public scholar profile and match history by username.
   */
  public static async getPublicProfile(username: string) {
    const db = await getDb();
    const cleanUsername = username.trim();

    const foundUsers = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${cleanUsername})`)
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error(`Scholar '${username}' not found.`);
    }

    const user = foundUsers[0];

    // Fetch profile
    const profiles = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, user.id))
      .limit(1);

    const profile = profiles[0] || {
      userId: user.id,
      avatarId: 'avatar_default_01',
      accountLevel: 1,
      lifetimeXp: 0,
      totalMatches: 0,
      totalWins: 0,
      totalWordsPlayed: 0,
      longestWord: '',
    };

    // Fetch active season rank
    const activeSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);

    const activeSeason = activeSeasons[0] || { id: 1 };

    const ranks = await db
      .select()
      .from(playerRankProfiles)
      .where(
        and(
          eq(playerRankProfiles.userId, user.id),
          eq(playerRankProfiles.seasonId, activeSeason.id)
        )
      );

    const findGameRank = (gt: string) =>
      ranks.find((r) => (r.gameType || 'WORDCHAIN') === gt) || {
        tier: 'NURSERY',
        division: 3,
        rankExp: 0,
        scientistPoints: 0,
        highestTier: 'NURSERY',
        highestScientistPoints: 0,
        hiddenMmr: 1000,
        seasonMatches: 0,
        seasonWins: 0,
      };

    const wordRank = findGameRank('WORDCHAIN');
    const mathRank = findGameRank('MATHRACE');

    // Fetch recent match history (last 10 matches across all portal games)
    const recentMatches = await db
      .select({
        matchId: matchPlayers.matchId,
        placement: matchPlayers.placement,
        wordsSubmitted: matchPlayers.wordsSubmitted,
        rankExpChange: matchPlayers.rankExpChange,
        scientistPointsChange: matchPlayers.scientistPointsChange,
        accountXpEarned: matchPlayers.accountXpEarned,
        eliminatedReason: matchPlayers.eliminatedReason,
        gameType: matches.gameType,
        gameMode: matches.gameMode,
        completedAt: matches.completedAt,
        totalRounds: matches.totalRounds,
      })
      .from(matchPlayers)
      .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
      .where(eq(matchPlayers.userId, user.id))
      .orderBy(desc(matches.completedAt))
      .limit(10);

    const winRate =
      profile.totalMatches > 0
        ? Math.round((profile.totalWins / profile.totalMatches) * 1000) / 10
        : 0;

    return {
      userId: user.id,
      username: user.username,
      avatarId: profile.avatarId,
      accountLevel: profile.accountLevel,
      lifetimeXp: profile.lifetimeXp,
      totalMatches: profile.totalMatches,
      totalWins: profile.totalWins,
      winRate,
      totalWordsPlayed: profile.totalWordsPlayed,
      longestWord: profile.longestWord,
      currentRank: {
        tier: wordRank.tier as AcademicRankTier,
        division: wordRank.division,
        rankExp: wordRank.rankExp,
        scientistPoints: wordRank.scientistPoints,
        hiddenMmr: wordRank.hiddenMmr,
      },
      highestRank: {
        highestTier: wordRank.highestTier as AcademicRankTier,
        highestScientistPoints: wordRank.highestScientistPoints,
      },
      gameRanks: {
        WORDCHAIN: {
          tier: wordRank.tier as AcademicRankTier,
          division: wordRank.division,
          rankExp: wordRank.rankExp,
          scientistPoints: wordRank.scientistPoints,
          hiddenMmr: wordRank.hiddenMmr,
          seasonMatches: wordRank.seasonMatches ?? 0,
          seasonWins: wordRank.seasonWins ?? 0,
        },
        MATHRACE: {
          tier: mathRank.tier as AcademicRankTier,
          division: mathRank.division,
          rankExp: mathRank.rankExp,
          scientistPoints: mathRank.scientistPoints,
          hiddenMmr: mathRank.hiddenMmr,
          seasonMatches: mathRank.seasonMatches ?? 0,
          seasonWins: mathRank.seasonWins ?? 0,
        },
      },
      matchHistory: recentMatches,
    };
  }

  /**
   * Updates scholar avatar if unlocked by account level.
   */
  public static async updateAvatar(userId: string, avatarId: string) {
    const db = await getDb();

    const avatarConfig = COSMETIC_AVATARS.find((a) => a.id === avatarId);
    if (!avatarConfig) {
      throw new Error(`Avatar '${avatarId}' is not recognized.`);
    }

    const profiles = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);

    const profile = profiles[0] || { accountLevel: 1 };
    if (profile.accountLevel < avatarConfig.requiredAccountLevel) {
      throw new Error(
        `Avatar requires Account Level ${avatarConfig.requiredAccountLevel}. Current Level: ${profile.accountLevel}`
      );
    }

    await db
      .update(playerProfiles)
      .set({ avatarId })
      .where(eq(playerProfiles.userId, userId));

    return { success: true, avatarId };
  }
}
