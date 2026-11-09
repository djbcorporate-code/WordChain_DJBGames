import { LexiconService } from '@wordchain/lexicon';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { adminAuditLogs, matches, users } from '../../db/schema.js';
import { GameRoom } from '../../game/GameRoom.js';
import { RoomManager } from '../../game/RoomManager.js';
import { getIoServer } from '../../sockets/socketRegistry.js';
import { MatchmakingService } from '../matchmaking/MatchmakingService.js';

export class AdminService {
  /**
   * Aggregates real-time server telemetry, rooms, queue depths, and memory usage.
   */
  public static async getTelemetry() {
    const db = await getDb();
    const roomManager = RoomManager.getInstance();
    const matchmaking = MatchmakingService.getInstance();

    const activeRooms = Array.from((roomManager as any).rooms.values()) as GameRoom[];

    let casualRooms = 0;
    let rankedRooms = 0;
    let privateRooms = 0;
    let totalActivePlayers = 0;
    let totalSpectators = 0;

    for (const r of activeRooms) {
      if (r.mode === 'CASUAL') casualRooms++;
      else if (r.mode === 'RANKED') rankedRooms++;
      else if (r.mode === 'PRIVATE') privateRooms++;

      totalActivePlayers += r.players.size;
    }

    // Queue depth
    const internalQueue = (matchmaking as any).queue as any[] || [];
    const casualQueueCount = internalQueue.filter((p) => p.mode === 'CASUAL').length;
    const rankedQueueCount = internalQueue.filter((p) => p.mode === 'RANKED').length;

    // Database aggregate counts
    const userCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalRegisteredUsers = Number(userCountRes[0]?.count || 0);

    const matchesCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches)
      .where(eq(matches.status, 'COMPLETED'));
    const totalMatchesCompleted = Number(matchesCountRes[0]?.count || 0);

    const memoryUsage = process.memoryUsage();

    return {
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
      rooms: {
        total: activeRooms.length,
        casual: casualRooms,
        ranked: rankedRooms,
        private: privateRooms,
        activePlayers: totalActivePlayers,
      },
      matchmaking: {
        casualQueueCount,
        rankedQueueCount,
        totalInQueue: internalQueue.length,
      },
      lexicon: {
        totalWords: LexiconService.getInstance().size(),
      },
      database: {
        totalRegisteredUsers,
        totalMatchesCompleted,
      },
    };
  }

  /**
   * Suspends a scholar account, logs the action to audit trail,
   * and terminates any active WebSocket connections immediately.
   */
  public static async suspendUser(
    adminUserId: string,
    targetUserId: string,
    reason: string = 'Violation of WordChain fair play terms.',
    ipAddress?: string
  ) {
    const db = await getDb();

    const targetUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (targetUsers.length === 0) {
      throw new Error(`Scholar with ID '${targetUserId}' does not exist.`);
    }

    const target = targetUsers[0];
    if (target.role === 'ADMIN') {
      throw new Error('Administrators cannot be suspended.');
    }

    // Update user role to BANNED
    await db
      .update(users)
      .set({ role: 'BANNED', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    // Log to admin audit trail
    await db.insert(adminAuditLogs).values({
      adminUserId,
      action: 'SUSPEND_USER',
      targetId: targetUserId,
      metadata: JSON.stringify({ username: target.username, reason }),
      ipAddress,
    });

    // Real-time socket termination
    const io = getIoServer();
    if (io) {
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if ((s.data as any)?.user?.userId === targetUserId) {
          s.emit('SOCKET_ERROR', {
            code: 'ACCOUNT_SUSPENDED',
            message: `Your account has been suspended: ${reason}`,
          });
          s.disconnect(true);
        }
      }
    }

    // Eliminate player from any ongoing match
    const roomManager = RoomManager.getInstance();
    const activeRooms = Array.from((roomManager as any).rooms.values()) as GameRoom[];
    for (const r of activeRooms) {
      if (r.players.has(targetUserId)) {
        r.eliminatePlayer(targetUserId, 'FORFEIT');
      }
    }

    return {
      success: true,
      message: `Scholar '${target.username}' suspended and active sessions terminated.`,
    };
  }

  /**
   * Reinstates a suspended scholar account.
   */
  public static async unsuspendUser(
    adminUserId: string,
    targetUserId: string,
    ipAddress?: string
  ) {
    const db = await getDb();

    const targetUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (targetUsers.length === 0) {
      throw new Error(`Scholar with ID '${targetUserId}' does not exist.`);
    }

    const target = targetUsers[0];

    await db
      .update(users)
      .set({ role: 'USER', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    await db.insert(adminAuditLogs).values({
      adminUserId,
      action: 'UNSUSPEND_USER',
      targetId: targetUserId,
      metadata: JSON.stringify({ username: target.username }),
      ipAddress,
    });

    return {
      success: true,
      message: `Scholar '${target.username}' has been reinstated.`,
    };
  }

  /**
   * Dynamically adds a custom word to the in-memory tournament lexicon.
   */
  public static async addWordToLexicon(
    adminUserId: string,
    word: string,
    ipAddress?: string
  ) {
    const db = await getDb();
    const normalized = word.trim().toUpperCase();

    if (normalized.length < 3 || normalized.length > 46) {
      throw new Error('Word length must be between 3 and 46 characters.');
    }

    const added = LexiconService.getInstance().addWord(normalized);
    if (!added) {
      throw new Error(`Word '${normalized}' is already in the approved lexicon.`);
    }

    await db.insert(adminAuditLogs).values({
      adminUserId,
      action: 'LEXICON_ADD_WORD',
      targetId: normalized,
      metadata: JSON.stringify({ word: normalized }),
      ipAddress,
    });

    return { success: true, word: normalized };
  }

  /**
   * Dynamically blacklists a word from the active lexicon.
   */
  public static async banWordFromLexicon(
    adminUserId: string,
    word: string,
    reason: string = 'Administrative blacklist override.',
    ipAddress?: string
  ) {
    const db = await getDb();
    const normalized = word.trim().toUpperCase();

    const banned = LexiconService.getInstance().banWord(normalized);
    if (!banned) {
      throw new Error(`Word '${normalized}' was not found in the active lexicon.`);
    }

    await db.insert(adminAuditLogs).values({
      adminUserId,
      action: 'LEXICON_BAN_WORD',
      targetId: normalized,
      metadata: JSON.stringify({ word: normalized, reason }),
      ipAddress,
    });

    return { success: true, word: normalized };
  }

  /**
   * Retrieves chronological administrative audit logs.
   */
  public static async getAuditLogs(limit: number = 25) {
    const db = await getDb();

    const logs = await db
      .select({
        id: adminAuditLogs.id,
        adminUserId: adminAuditLogs.adminUserId,
        adminUsername: users.username,
        action: adminAuditLogs.action,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        ipAddress: adminAuditLogs.ipAddress,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .innerJoin(users, eq(adminAuditLogs.adminUserId, users.id))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit);

    return logs;
  }
}
