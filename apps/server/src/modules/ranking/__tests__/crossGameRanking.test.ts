import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';
import { AuthService } from '../../auth/auth.service.js';
import { ProfileService } from '../../profile/profile.service.js';
import { RankingService } from '../RankingService.js';

describe('Cross-Game Shared Account & Per-Game Ranked Separation', () => {
  beforeAll(async () => {
    await getDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('registers once website-wide, settles 6-player MathBlitz Ranked independently of WordChain, and separates leaderboards', async () => {
    const uniq = Date.now();
    const players: { id: string; username: string }[] = [];

    for (let i = 1; i <= 6; i++) {
      const reg = await AuthService.register({
        email: `mathpro_${uniq}_${i}@example.com`,
        username: `mathpro_${uniq}_${i}`,
        displayName: `MathPro ${i}`,
        password: 'Password123!',
      });
      players.push({ id: reg.user.id, username: reg.user.username });
      expect(reg.user.gameRanks?.WORDCHAIN?.tier).toBe('NURSERY');
      expect(reg.user.gameRanks?.MATHRACE?.tier).toBe('NURSERY');
    }

    // Settle a 6-player Ranked MathBlitz match
    const matchId = crypto.randomUUID();
    const deltas = await RankingService.settleMatchSummary(matchId, {
      roomCode: `M${String(uniq).slice(-5)}`,
      gameType: 'MATHRACE',
      mode: 'RANKED',
      roundNumber: 10,
      createdAt: Date.now(),
      participants: players.map((p, idx) => ({
        userId: p.id,
        tier: 'NURSERY',
        division: 3,
        placement: idx + 1,
        activityCount: 900 - idx * 100,
        eliminatedReason: idx === 0 ? 'WINNER' : 'COMPLETED',
      })),
    });

    expect(deltas[players[0].id]).toBeDefined();
    expect(deltas[players[0].id].expChange).toBeGreaterThan(0);
    expect(deltas[players[5].id]).toBeDefined();

    // Verify winner's shared account XP updated, totalWordsPlayed remained 0,
    // MATHRACE rank progressed while WORDCHAIN stayed at baseline Nursery 0 EXP
    const winnerProfile = await AuthService.getFullUserProfile(players[0].id);
    expect(winnerProfile.profile.totalMatches).toBe(1);
    expect(winnerProfile.profile.totalWins).toBe(1);
    expect(winnerProfile.profile.totalWordsPlayed).toBe(0);
    expect(winnerProfile.profile.lifetimeXp).toBeGreaterThan(0);

    expect(winnerProfile.gameRanks?.MATHRACE.rankExp).toBeGreaterThan(0);
    expect(winnerProfile.gameRanks?.MATHRACE.seasonWins).toBe(1);
    expect(winnerProfile.gameRanks?.WORDCHAIN.tier).toBe('NURSERY');
    expect(winnerProfile.gameRanks?.WORDCHAIN.rankExp).toBe(0);
    expect(winnerProfile.gameRanks?.WORDCHAIN.seasonMatches).toBe(0);

    // Public profile exposes matchHistory with gameType: 'MATHRACE' & dual gameRanks
    const pubProfile = await ProfileService.getPublicProfile(players[0].username);
    expect(pubProfile?.gameRanks?.MATHRACE.rankExp).toBeGreaterThan(0);
    expect(pubProfile?.matchHistory[0]?.gameType).toBe('MATHRACE');

    // Leaderboards separate MATHRACE from WORDCHAIN
    const mathBoard = await request(app).get('/api/v1/leaderboards?type=SEASONAL&gameType=MATHRACE&limit=20');
    expect(mathBoard.status).toBe(200);
    const mathWinnerRow = mathBoard.body.entries.find((e: any) => e.userId === players[0].id);
    expect(mathWinnerRow).toBeDefined();
    expect(mathWinnerRow.rankExp).toBeGreaterThan(0);

    const wordBoard = await request(app).get('/api/v1/leaderboards?type=SEASONAL&gameType=WORDCHAIN&limit=50');
    expect(wordBoard.status).toBe(200);
    const wordWinnerRow = wordBoard.body.entries.find((e: any) => e.userId === players[0].id);
    expect(wordWinnerRow?.rankExp ?? 0).toBe(0);
  });
});
