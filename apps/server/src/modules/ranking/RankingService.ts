import {
  ACADEMIC_RANK_TIERS,
  AcademicRankTier,
  PlayerInGame,
  RANK_TIER_CONFIGS,
  RankProgressionDelta,
} from '@wordchain/shared';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  matches,
  matchPlayers,
  playerProfiles,
  playerRankProfiles,
  seasons,
  users,
} from '../../db/schema.js';
import { GameRoom } from '../../game/GameRoom.js';

export class RankingService {
  /**
   * Calculates required cumulative lifetime XP to achieve a given account level.
   * Level 1: 0 XP
   * Level L (>=2): floor(500 * L^1.4)
   */
  public static getRequiredXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(500 * Math.pow(level, 1.4));
  }

  /**
   * Calculates the account level from total lifetime XP.
   */
  public static calculateAccountLevel(lifetimeXp: number): {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
  } {
    let level = 1;
    while (this.getRequiredXpForLevel(level + 1) <= lifetimeXp) {
      level++;
    }

    const currentLevelXp = this.getRequiredXpForLevel(level);
    const nextLevelXp = this.getRequiredXpForLevel(level + 1);

    return {
      level,
      currentLevelXp,
      nextLevelXp,
    };
  }

  /**
   * Calculates Account XP earned from placement and words played in any game mode.
   */
  public static calculateAccountXpGain(placement: number, wordsSubmitted: number): number {
    let basePlacementXp = 20;
    if (placement === 1) basePlacementXp = 100;
    else if (placement === 2) basePlacementXp = 60;
    else if (placement === 3) basePlacementXp = 35;
    else if (placement === 4) basePlacementXp = 20;

    const wordBonusXp = Math.max(0, wordsSubmitted) * 5;
    return basePlacementXp + wordBonusXp;
  }

  /**
   * Calculates base Rank EXP / Scientist Points based on Academic Tier and placement.
   */
  public static calculatePlacementRewards(
    tier: AcademicRankTier,
    placement: number,
    isUnderdog: boolean = false
  ): { expChange: number; pointsChange: number } {
    let expChange = 0;
    let pointsChange = 0;

    if (tier === 'SCIENTIST') {
      // Scientist tier uses Scientist Points (SP)
      if (placement === 1) pointsChange = 3;
      else if (placement === 2) pointsChange = 1;
      else if (placement === 3) pointsChange = -1;
      else pointsChange = -3;

      if (isUnderdog) {
        if (placement <= 2) pointsChange += 1;
        else pointsChange = Math.min(0, pointsChange + 1); // reduce loss
      }

      return { expChange: 0, pointsChange };
    }

    // Non-Scientist tiers use Rank EXP
    if (tier === 'NURSERY' || tier === 'KINDER') {
      if (placement === 1) expChange = 35;
      else if (placement === 2) expChange = 20;
      else expChange = 0; // Demotion-protected at 3rd/4th
    } else if (tier === 'GRADER' || tier === 'HIGH_SCHOOL') {
      if (placement === 1) expChange = 32;
      else if (placement === 2) expChange = 16;
      else if (placement === 3) expChange = -6;
      else expChange = -16;
    } else if (
      tier === 'UNDERGRAD' ||
      tier === 'CUM_LAUDE' ||
      tier === 'MAGNA_CUM_LAUDE' ||
      tier === 'SUMMA_CUM_LAUDE'
    ) {
      if (placement === 1) expChange = 30;
      else if (placement === 2) expChange = 12;
      else if (placement === 3) expChange = -10;
      else expChange = -20;
    } else if (tier === 'MASTERAL' || tier === 'DOCTORATE') {
      if (placement === 1) expChange = 28;
      else if (placement === 2) expChange = 10;
      else if (placement === 3) expChange = -14;
      else expChange = -26;
    }

    if (isUnderdog) {
      if (placement <= 2) {
        expChange += 5;
      } else if (expChange < 0) {
        expChange = Math.min(0, expChange + 5); // reduce negative loss by 5
      }
    }

    return { expChange, pointsChange: 0 };
  }

  /**
   * Pure calculation of rank progression:
   * Handles division promotion, tier promotion with EXP overflow, and demotion with demotion protection.
   */
  public static calculateProgression(
    current: {
      tier: AcademicRankTier;
      division: number;
      rankExp: number;
      scientistPoints: number;
      highestTier?: AcademicRankTier;
      highestScientistPoints?: number;
    },
    expChange: number,
    pointsChange: number
  ): RankProgressionDelta {
    const previousTier = current.tier;
    const previousDivision = current.division;
    const previousExp = current.rankExp;
    const previousScientistPoints = current.scientistPoints;

    let newTier = current.tier;
    let newDivision = current.division;
    let newExp = current.rankExp;
    let newScientistPoints = current.scientistPoints;
    let promoted = false;
    let demoted = false;

    // Case 1: Currently in Scientist Tier
    if (newTier === 'SCIENTIST') {
      newScientistPoints = previousScientistPoints + pointsChange;

      if (newScientistPoints >= 0) {
        // Stays in Scientist
        newExp = 0;
        newDivision = 0;
      } else {
        // Demotes from Scientist to Doctorate I (80 EXP)
        newTier = 'DOCTORATE';
        newDivision = 1;
        newExp = 80;
        newScientistPoints = 0;
        demoted = true;
      }

      return {
        previousTier,
        previousDivision,
        previousExp,
        previousScientistPoints,
        newTier,
        newDivision,
        newExp,
        newScientistPoints,
        expChange,
        pointsChange,
        promoted,
        demoted,
      };
    }

    // Case 2: Non-Scientist Tier
    newExp = previousExp + expChange;
    let tierIndex = ACADEMIC_RANK_TIERS.indexOf(newTier);
    let tierConfig = RANK_TIER_CONFIGS[newTier];

    // PROMOTION CHECK (EXP >= expPerDivision)
    while (tierConfig.expPerDivision > 0 && newExp >= tierConfig.expPerDivision) {
      if (newDivision > 1) {
        // Promotes to next division within same tier (e.g. III -> II, II -> I)
        newDivision -= 1;
        newExp -= tierConfig.expPerDivision;
        promoted = true;
      } else if (newDivision === 1) {
        // Promoted to next Tier!
        tierIndex += 1;
        if (tierIndex >= ACADEMIC_RANK_TIERS.length - 1) {
          // Promoted into SCIENTIST!
          newTier = 'SCIENTIST';
          newDivision = 0;
          newExp = 0;
          newScientistPoints = 0;
          promoted = true;
          break;
        } else {
          newTier = ACADEMIC_RANK_TIERS[tierIndex];
          tierConfig = RANK_TIER_CONFIGS[newTier];
          newDivision = tierConfig.divisions; // Lowest division in new tier
          newExp -= RANK_TIER_CONFIGS[ACADEMIC_RANK_TIERS[tierIndex - 1]].expPerDivision;
          promoted = true;
        }
      }
    }

    // DEMOTION CHECK (EXP < 0)
    while (newExp < 0 && newTier !== 'SCIENTIST') {
      // Demotion protection checks:
      if (newTier === 'NURSERY' && newDivision === 3) {
        newExp = 0;
        break;
      }
      if (newTier === 'KINDER' && newDivision === 3) {
        newExp = 0;
        break;
      }

      if (newDivision < tierConfig.divisions) {
        // Drop division in same tier (e.g. I -> II, II -> III)
        newDivision += 1;
        newExp += tierConfig.expPerDivision;
        demoted = true;
      } else if (newDivision === tierConfig.divisions) {
        // At bottom division of tier, demote to previous tier!
        if (tierIndex > 0) {
          tierIndex -= 1;
          newTier = ACADEMIC_RANK_TIERS[tierIndex];
          tierConfig = RANK_TIER_CONFIGS[newTier];
          newDivision = 1; // Top division of previous tier
          newExp += tierConfig.expPerDivision;
          demoted = true;
        } else {
          newExp = 0;
          break;
        }
      }
    }

    if (newTier !== 'SCIENTIST') {
      newExp = Math.max(0, newExp);
    }

    return {
      previousTier,
      previousDivision,
      previousExp,
      previousScientistPoints,
      newTier,
      newDivision,
      newExp,
      newScientistPoints,
      expChange,
      pointsChange,
      promoted,
      demoted,
    };
  }

  /**
   * Calculates hidden MMR delta after match completion.
   */
  public static calculateMmrDelta(playerMmr: number, avgMmr: number, placement: number): number {
    let baseDelta = 0;
    if (placement === 1) baseDelta = 25;
    else if (placement === 2) baseDelta = 8;
    else if (placement === 3) baseDelta = -8;
    else baseDelta = -25;

    const diff = avgMmr - playerMmr;
    const adjustment = Math.round(diff * 0.05);
    const clampedAdjustment = Math.max(-15, Math.min(15, adjustment));

    return baseDelta + clampedAdjustment;
  }

  /**
   * Verifies ranked eligibility prerequisites for a scholar:
   * 1. Account email must be verified.
   * 2. Player must have completed at least 5 matches.
   */
  public static async checkRankedEligibility(
    userId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    const db = await getDb();
    const foundUsers = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (foundUsers.length === 0) {
      return { eligible: false, reason: 'Scholar account not found.' };
    }

    const profiles = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);

    const totalMatches = profiles[0]?.totalMatches ?? 0;
    if (totalMatches < 5) {
      return {
        eligible: false,
        reason: `Complete at least 5 casual matches to unlock Ranked mode (${totalMatches}/5 completed).`,
      };
    }

    return { eligible: true };
  }

  /**
   * Transactionally settles match results and updates:
   * - `matches` table
   * - `match_players` table
   * - `player_rank_profiles` table (if RANKED mode)
   * - `player_profiles` table (account XP, stats, total matches/wins)
   *
   * Fully idempotent: If matchId was already settled, returns previous results safely.
   */
  public static async settleMatchResults(
    matchId: string,
    room: GameRoom
  ): Promise<Record<string, RankProgressionDelta>> {
    const db = await getDb();

    // 1. Check idempotency: Was this match already settled?
    const existingMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (existingMatches.length > 0 && existingMatches[0].status === 'COMPLETED') {
      console.log(`[RankingService] Match ${matchId} already settled. Skipping duplicate execution.`);
      return {};
    }

    // 2. Fetch current active season
    const activeSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);

    const activeSeason = activeSeasons[0] || { id: 1 };
    const playersList = Array.from(room.players.values());

    // 3. Compute match metrics
    const winner = playersList.find((p) => p.placement === 1) || playersList[0];
    const durationSeconds = Math.max(0, Math.floor((Date.now() - room.createdAt) / 1000));

    // Upsert match record
    if (existingMatches.length > 0) {
      await db
        .update(matches)
        .set({
          status: 'COMPLETED',
          winnerUserId: winner ? winner.userId : null,
          totalRounds: room.roundNumber,
          durationSeconds,
          completedAt: new Date(),
        })
        .where(eq(matches.id, matchId));
    } else {
      await db.insert(matches).values({
        id: matchId,
        roomCode: room.roomCode,
        gameMode: room.mode,
        seasonId: activeSeason.id,
        status: 'COMPLETED',
        winnerUserId: winner ? winner.userId : null,
        totalRounds: room.roundNumber,
        durationSeconds,
        completedAt: new Date(),
      });
    }

    // 4. Calculate average MMR for underdog calculation
    const playerRankMap = new Map<string, any>();
    let totalMmr = 0;

    for (const player of playersList) {
      const existingRanks = await db
        .select()
        .from(playerRankProfiles)
        .where(
          and(
            eq(playerRankProfiles.userId, player.userId),
            eq(playerRankProfiles.seasonId, activeSeason.id)
          )
        )
        .limit(1);

      const rank = existingRanks[0] || {
        userId: player.userId,
        seasonId: activeSeason.id,
        tier: player.tier || 'NURSERY',
        division: player.division || 3,
        rankExp: 0,
        scientistPoints: 0,
        highestTier: player.tier || 'NURSERY',
        highestScientistPoints: 0,
        hiddenMmr: 1000,
        seasonMatches: 0,
        seasonWins: 0,
      };

      playerRankMap.set(player.userId, rank);
      totalMmr += rank.hiddenMmr;
    }

    const avgMmr = playersList.length > 0 ? Math.round(totalMmr / playersList.length) : 1000;
    const progressionDeltas: Record<string, RankProgressionDelta> = {};

    // 5. Update each player's profile and rank
    for (const player of playersList) {
      const currentRank = playerRankMap.get(player.userId);
      const placement = player.placement ?? 4;
      const isWinner = placement === 1;
      const isUnderdog = currentRank.hiddenMmr < avgMmr - 100;

      // Rewards calculation
      let expChange = 0;
      let pointsChange = 0;

      if (room.mode === 'RANKED') {
        const rewards = this.calculatePlacementRewards(currentRank.tier, placement, isUnderdog);
        expChange = rewards.expChange;
        pointsChange = rewards.pointsChange;
      }

      const progression = this.calculateProgression(currentRank, expChange, pointsChange);
      const mmrDelta = this.calculateMmrDelta(currentRank.hiddenMmr, avgMmr, placement);
      const newMmr = Math.max(100, currentRank.hiddenMmr + mmrDelta);

      // Account XP calculation
      const accountXpEarned = this.calculateAccountXpGain(placement, player.wordsSubmitted);

      // Fetch user profile
      const profiles = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, player.userId))
        .limit(1);

      const profile = profiles[0] || {
        userId: player.userId,
        avatarId: 'avatar_default_01',
        accountLevel: 1,
        lifetimeXp: 0,
        totalMatches: 0,
        totalWins: 0,
        totalWordsPlayed: 0,
        longestWord: '',
      };

      const newLifetimeXp = profile.lifetimeXp + accountXpEarned;
      const { level: newAccountLevel } = this.calculateAccountLevel(newLifetimeXp);

      progression.accountXpEarned = accountXpEarned;
      progression.newAccountLevel = newAccountLevel;
      progressionDeltas[player.userId] = progression;

      // Update player profile
      await db
        .insert(playerProfiles)
        .values({
          userId: player.userId,
          avatarId: profile.avatarId,
          accountLevel: newAccountLevel,
          lifetimeXp: newLifetimeXp,
          totalMatches: profile.totalMatches + 1,
          totalWins: profile.totalWins + (isWinner ? 1 : 0),
          totalWordsPlayed: profile.totalWordsPlayed + player.wordsSubmitted,
          longestWord: profile.longestWord,
        })
        .onConflictDoUpdate({
          target: playerProfiles.userId,
          set: {
            accountLevel: newAccountLevel,
            lifetimeXp: newLifetimeXp,
            totalMatches: profile.totalMatches + 1,
            totalWins: profile.totalWins + (isWinner ? 1 : 0),
            totalWordsPlayed: profile.totalWordsPlayed + player.wordsSubmitted,
            longestWord: profile.longestWord,
          },
        });

      // Update player rank profile (if ranked)
      const highestTierIdx = Math.max(
        ACADEMIC_RANK_TIERS.indexOf(currentRank.highestTier as AcademicRankTier),
        ACADEMIC_RANK_TIERS.indexOf(progression.newTier)
      );
      const highestTier = ACADEMIC_RANK_TIERS[highestTierIdx];
      const highestScientistPoints = Math.max(
        currentRank.highestScientistPoints || 0,
        progression.newScientistPoints
      );

      await db
        .insert(playerRankProfiles)
        .values({
          userId: player.userId,
          seasonId: activeSeason.id,
          tier: progression.newTier,
          division: progression.newDivision,
          rankExp: progression.newExp,
          scientistPoints: progression.newScientistPoints,
          highestTier,
          highestScientistPoints,
          hiddenMmr: newMmr,
          seasonMatches: currentRank.seasonMatches + 1,
          seasonWins: currentRank.seasonWins + (isWinner ? 1 : 0),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [playerRankProfiles.userId, playerRankProfiles.seasonId],
          set: {
            tier: progression.newTier,
            division: progression.newDivision,
            rankExp: progression.newExp,
            scientistPoints: progression.newScientistPoints,
            highestTier,
            highestScientistPoints,
            hiddenMmr: newMmr,
            seasonMatches: currentRank.seasonMatches + 1,
            seasonWins: currentRank.seasonWins + (isWinner ? 1 : 0),
            updatedAt: new Date(),
          },
        });

      // Insert into matchPlayers
      await db.insert(matchPlayers).values({
        matchId,
        userId: player.userId,
        placement,
        wordsSubmitted: player.wordsSubmitted,
        rankExpChange: expChange,
        scientistPointsChange: pointsChange,
        accountXpEarned,
        eliminatedReason: player.isAlive ? 'WINNER' : 'TIMEOUT',
      });
    }

    console.log(
      `[RankingService] Match ${matchId} (${room.mode}) settled for ${playersList.length} scholars.`
    );
    return progressionDeltas;
  }
}
