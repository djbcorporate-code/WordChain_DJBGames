import {
  AuthenticatedUser,
  ForgotPasswordInput,
  GameRankStanding,
  GameType,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@wordchain/shared';
import { and, eq, or } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { playerProfiles, playerRankProfiles, seasons, users } from '../../db/schema.js';
import { generateJwt, generateRandomToken, hashPassword, verifyPassword } from '../../utils/security.js';

export class AuthService {
  static async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; token: string; verificationToken: string }> {
    const db = await getDb();
    const normalizedUsername = input.username.trim();
    const normalizedDisplayName = (input.displayName || input.username).trim();
    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : `${normalizedUsername.toLowerCase()}@wordchain.local`;

    // Check if username is already taken (or email if provided)
    const existing = await db
      .select()
      .from(users)
      .where(or(
        eq(users.username, normalizedUsername),
        input.email ? eq(users.email, normalizedEmail) : eq(users.username, normalizedUsername)
      ))
      .limit(1);

    if (existing.length > 0) {
      const match = existing[0];
      if (match.username.toLowerCase() === normalizedUsername.toLowerCase()) {
        throw new Error('Username is already taken. Please choose another.');
      }
      if (input.email && match.email?.toLowerCase() === normalizedEmail) {
        throw new Error('An account with this email already exists.');
      }
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateRandomToken(32);

    // Insert user (email verified by default, immediate login enabled)
    const [createdUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        passwordHash,
        emailVerified: true,
        verificationToken,
        role: 'USER',
      })
      .returning();

    // Initialize player profile
    const [profile] = await db
      .insert(playerProfiles)
      .values({
        userId: createdUser.id,
        avatarId: 'avatar_default_01',
        accountLevel: 1,
        lifetimeXp: 0,
        totalMatches: 0,
        totalWins: 0,
        totalWordsPlayed: 0,
        longestWord: '',
      })
      .returning();

    // Retrieve active season
    const activeSeasons = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
    const seasonId = activeSeasons.length > 0 ? activeSeasons[0].id : 1;

    await this.initializeGameRanks(createdUser.id, seasonId);

    const token = generateJwt({
      userId: createdUser.id,
      username: createdUser.username,
      displayName: createdUser.displayName || createdUser.username,
      role: createdUser.role,
      emailVerified: createdUser.emailVerified,
    });

    const authenticatedUser = await this.getFullUserProfile(createdUser.id);

    return { user: authenticatedUser, token, verificationToken };
  }

  static async loginAsGuest(): Promise<{ user: AuthenticatedUser; token: string }> {
    const db = await getDb();
    const guestSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `Guest_${guestSuffix}`;
    const guestDisplayName = `Guest ${guestSuffix}`;
    const guestEmail = `guest_${guestSuffix}_${Date.now()}@wordchain.guest`;
    const randomPassword = generateRandomToken(16);
    const passwordHash = await hashPassword(randomPassword);

    const [createdUser] = await db
      .insert(users)
      .values({
        email: guestEmail,
        username: guestUsername,
        displayName: guestDisplayName,
        passwordHash,
        emailVerified: true,
        verificationToken: generateRandomToken(32),
        role: 'USER',
      })
      .returning();

    const [profile] = await db
      .insert(playerProfiles)
      .values({
        userId: createdUser.id,
        avatarId: `avatar_0${Math.floor(1 + Math.random() * 4)}`,
        accountLevel: 1,
        lifetimeXp: 0,
        totalMatches: 0,
        totalWins: 0,
        totalWordsPlayed: 0,
        longestWord: '',
      })
      .returning();

    const activeSeasons = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
    const seasonId = activeSeasons.length > 0 ? activeSeasons[0].id : 1;

    await this.initializeGameRanks(createdUser.id, seasonId);

    const token = generateJwt({
      userId: createdUser.id,
      username: createdUser.username,
      displayName: createdUser.displayName || createdUser.username,
      role: createdUser.role,
      emailVerified: createdUser.emailVerified,
    });

    const authenticatedUser = await this.getFullUserProfile(createdUser.id);

    return { user: authenticatedUser, token };
  }

  static async login(input: LoginInput): Promise<{ user: AuthenticatedUser; token: string }> {
    const db = await getDb();
    const identifier = (input.username || input.emailOrUsername || '').trim();
    const queryLower = identifier.toLowerCase();

    const foundUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.email, queryLower), eq(users.username, identifier)))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error('Invalid username or password.');
    }

    const user = foundUsers[0];

    if (user.role === 'BANNED') {
      throw new Error('This scholar account has been suspended for violating fair play terms.');
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);

    if (!passwordValid) {
      throw new Error('Invalid username or password.');
    }

    const authenticatedUser = await this.getFullUserProfile(user.id);

    const token = generateJwt({
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
      emailVerified: user.emailVerified,
    });

    return { user: authenticatedUser, token };
  }

  static async verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
    const db = await getDb();
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, input.token))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error('Invalid or expired verification token.');
    }

    const user = foundUsers[0];
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { message: 'Email successfully verified! You may now access all multiplayer modes.' };
  }

  static async requestPasswordReset(input: ForgotPasswordInput): Promise<{ resetToken: string }> {
    const db = await getDb();
    const email = input.email.trim().toLowerCase();

    const foundUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (foundUsers.length === 0) {
      // Return a simulated token or success to avoid email enumeration
      return { resetToken: 'SIMULATED_TOKEN' };
    }

    const user = foundUsers[0];
    const resetToken = generateRandomToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({
        resetPasswordToken: resetToken,
        resetPasswordExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { resetToken };
  }

  static async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const db = await getDb();
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.resetPasswordToken, input.token))
      .limit(1);

    if (foundUsers.length === 0) {
      throw new Error('Invalid or expired password reset token.');
    }

    const user = foundUsers[0];
    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      throw new Error('Password reset token has expired. Please request a new one.');
    }

    const passwordHash = await hashPassword(input.newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { message: 'Password reset successful. You may now log in with your new password.' };
  }

  private static async initializeGameRanks(userId: string, seasonId: number): Promise<void> {
    const db = await getDb();
    const games: GameType[] = ['WORDCHAIN', 'MATHRACE'];
    for (const gameType of games) {
      await db
        .insert(playerRankProfiles)
        .values({
          userId,
          seasonId,
          gameType,
          tier: 'NURSERY',
          division: 3,
          rankExp: 0,
          scientistPoints: 0,
          highestTier: 'NURSERY',
          highestScientistPoints: 0,
          hiddenMmr: 1000,
          seasonMatches: 0,
          seasonWins: 0,
        })
        .onConflictDoNothing();
    }
  }

  private static defaultRankStanding(): GameRankStanding {
    return {
      tier: 'NURSERY',
      division: 3,
      rankExp: 0,
      scientistPoints: 0,
      hiddenMmr: 1000,
      seasonMatches: 0,
      seasonWins: 0,
    };
  }

  static async getFullUserProfile(userId: string): Promise<AuthenticatedUser> {
    const db = await getDb();
    const foundUsers = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (foundUsers.length === 0) {
      throw new Error('User not found.');
    }

    const user = foundUsers[0];

    const profiles = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
    const profile = profiles[0] || {
      userId,
      avatarId: 'avatar_default_01',
      accountLevel: 1,
      lifetimeXp: 0,
      totalMatches: 0,
      totalWins: 0,
      totalWordsPlayed: 0,
      longestWord: '',
    };

    const activeSeasons = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
    const activeSeasonId = activeSeasons.length > 0 ? activeSeasons[0].id : 1;

    const rankProfiles = await db
      .select()
      .from(playerRankProfiles)
      .where(and(eq(playerRankProfiles.userId, userId), eq(playerRankProfiles.seasonId, activeSeasonId)));

    const wordRankRow = rankProfiles.find((r) => (r.gameType || 'WORDCHAIN') === 'WORDCHAIN');
    const mathRankRow = rankProfiles.find((r) => r.gameType === 'MATHRACE');

    const mapRankRow = (row?: typeof rankProfiles[number]): GameRankStanding =>
      row
        ? {
            tier: row.tier as any,
            division: row.division,
            rankExp: row.rankExp,
            scientistPoints: row.scientistPoints,
            hiddenMmr: row.hiddenMmr,
            seasonMatches: row.seasonMatches,
            seasonWins: row.seasonWins,
          }
        : this.defaultRankStanding();

    const wordRank = mapRankRow(wordRankRow);
    const mathRank = mapRankRow(mathRankRow);

    return {
      id: user.id,
      email: user.email || undefined,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role as any,
      emailVerified: user.emailVerified,
      profile: {
        userId: profile.userId,
        avatarId: profile.avatarId,
        accountLevel: profile.accountLevel,
        lifetimeXp: profile.lifetimeXp,
        totalMatches: profile.totalMatches,
        totalWins: profile.totalWins,
        totalWordsPlayed: profile.totalWordsPlayed,
        longestWord: profile.longestWord,
      },
      currentRank: {
        tier: wordRank.tier,
        division: wordRank.division,
        rankExp: wordRank.rankExp,
        scientistPoints: wordRank.scientistPoints,
        hiddenMmr: wordRank.hiddenMmr,
      },
      gameRanks: {
        WORDCHAIN: wordRank,
        MATHRACE: mathRank,
      },
    };
  }
}
