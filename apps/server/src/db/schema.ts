import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 32 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(true).notNull(),
  verificationToken: varchar('verification_token', { length: 128 }),
  resetPasswordToken: varchar('reset_password_token', { length: 128 }),
  resetPasswordExpires: timestamp('reset_password_expires', { withTimezone: true }),
  role: varchar('role', { length: 16 }).default('USER').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const playerProfiles = pgTable('player_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  avatarId: varchar('avatar_id', { length: 64 }).default('avatar_default_01').notNull(),
  accountLevel: integer('account_level').default(1).notNull(),
  lifetimeXp: integer('lifetime_xp').default(0).notNull(),
  totalMatches: integer('total_matches').default(0).notNull(),
  totalWins: integer('total_wins').default(0).notNull(),
  totalWordsPlayed: integer('total_words_played').default(0).notNull(),
  longestWord: varchar('longest_word', { length: 32 }).default('').notNull(),
});

export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  seasonNumber: integer('season_number').notNull().unique(),
  name: varchar('name', { length: 64 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
});

export const playerRankProfiles = pgTable(
  'player_rank_profiles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id),
    tier: varchar('tier', { length: 32 }).default('NURSERY').notNull(),
    division: integer('division').default(3).notNull(),
    rankExp: integer('rank_exp').default(0).notNull(),
    scientistPoints: integer('scientist_points').default(0).notNull(),
    highestTier: varchar('highest_tier', { length: 32 }).default('NURSERY').notNull(),
    highestScientistPoints: integer('highest_scientist_points').default(0).notNull(),
    hiddenMmr: integer('hidden_mmr').default(1000).notNull(),
    seasonMatches: integer('season_matches').default(0).notNull(),
    seasonWins: integer('season_wins').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.seasonId] }),
    uniqueIndex('user_season_idx').on(table.userId, table.seasonId),
  ]
);

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: varchar('room_code', { length: 8 }).notNull(),
  gameMode: varchar('game_mode', { length: 16 }).notNull(),
  seasonId: integer('season_id').references(() => seasons.id),
  status: varchar('status', { length: 16 }).notNull(),
  winnerUserId: uuid('winner_user_id').references(() => users.id),
  totalRounds: integer('total_rounds').default(0).notNull(),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const matchPlayers = pgTable('match_players', {
  id: serial('id').primaryKey(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  placement: integer('placement'),
  wordsSubmitted: integer('words_submitted').default(0).notNull(),
  rankExpChange: integer('rank_exp_change').default(0).notNull(),
  scientistPointsChange: integer('scientist_points_change').default(0).notNull(),
  accountXpEarned: integer('account_xp_earned').default(0).notNull(),
  eliminatedReason: varchar('eliminated_reason', { length: 32 }),
});

export const matchWords = pgTable('match_words', {
  id: serial('id').primaryKey(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  word: varchar('word', { length: 32 }).notNull(),
  roundNumber: integer('round_number').notNull(),
  turnDurationMs: integer('turn_duration_ms').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  adminUserId: uuid('admin_user_id')
    .notNull()
    .references(() => users.id),
  action: varchar('action', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 64 }),
  metadata: text('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
