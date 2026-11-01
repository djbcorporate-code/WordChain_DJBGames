import { LexiconService } from '@wordchain/lexicon';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';
import { adminAuditLogs, users } from '../../../db/schema.js';
import { generateJwt } from '../../../utils/security.js';

describe('Phase 8: Administrative Dashboard, Anti-Abuse & Security Hardening', () => {
  const adminUser = {
    userId: '90909090-9090-9090-9090-909090909090',
    username: 'SysAdminChief',
    role: 'ADMIN' as const,
    emailVerified: true,
  };

  const normalUser = {
    userId: '80808080-8080-8080-8080-808080808080',
    username: 'NormalScholar',
    role: 'USER' as const,
    emailVerified: true,
  };

  const targetUser = {
    userId: '70707070-7070-7070-7070-707070707070',
    username: 'SuspiciousPlayer',
    role: 'USER' as const,
    emailVerified: true,
  };

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const db = await getDb();
    await LexiconService.getInstance().initialize();

    adminToken = generateJwt(adminUser);
    userToken = generateJwt(normalUser);

    // Seed test users
    await db
      .insert(users)
      .values([
        {
          id: adminUser.userId,
          email: 'admin@wordchain.io',
          username: adminUser.username,
          passwordHash: 'hash',
          role: 'ADMIN',
          emailVerified: true,
        },
        {
          id: normalUser.userId,
          email: 'normal@wordchain.io',
          username: normalUser.username,
          passwordHash: 'hash',
          role: 'USER',
          emailVerified: true,
        },
        {
          id: targetUser.userId,
          email: 'target@wordchain.io',
          username: targetUser.username,
          passwordHash: 'hash',
          role: 'USER',
          emailVerified: true,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('1. Role-Based Authorization & Security Gating', () => {
    it('should reject unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/telemetry');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/telemetry')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should grant access to users with ADMIN role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/telemetry')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.telemetry).toBeDefined();
    });
  });

  describe('2. Real-Time Telemetry Metrics', () => {
    it('should return system telemetry, room counts, memory stats, and database aggregates', async () => {
      const res = await request(app)
        .get('/api/v1/admin/telemetry')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const tel = res.body.telemetry;

      expect(tel.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(tel.memory.rssMb).toBeGreaterThan(0);
      expect(tel.memory.heapUsedMb).toBeGreaterThan(0);
      expect(tel.rooms).toBeDefined();
      expect(tel.matchmaking).toBeDefined();
      expect(tel.lexicon.totalWords).toBeGreaterThan(100000);
      expect(tel.database.totalRegisteredUsers).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. User Moderation & Account Suspension', () => {
    it('should allow admin to suspend a scholar and record an audit log', async () => {
      const db = await getDb();

      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Suspected automated script usage' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user role is BANNED
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUser.userId));

      expect(updatedUser[0].role).toBe('BANNED');

      // Verify audit log
      const logs = await db
        .select()
        .from(adminAuditLogs)
        .where(eq(adminAuditLogs.targetId, targetUser.userId));

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('SUSPEND_USER');
      expect(logs[0].metadata).toContain('Suspected automated script usage');
    });

    it('should prevent admin from suspending another administrator', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${adminUser.userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Self suspension attempt' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Administrators cannot be suspended');
    });

    it('should allow admin to unsuspend and restore a scholar', async () => {
      const db = await getDb();

      const res = await request(app)
        .post(`/api/v1/admin/users/${targetUser.userId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const restoredUser = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUser.userId));

      expect(restoredUser[0].role).toBe('USER');
    });
  });

  describe('4. Lexicon Override & Management', () => {
    it('should dynamically insert a new custom word into the in-memory lexicon', async () => {
      const customWord = 'CYBERPUNKISH';
      const lexicon = LexiconService.getInstance();

      expect(lexicon.hasWord(customWord)).toBe(false);

      const res = await request(app)
        .post('/api/v1/admin/lexicon/add-word')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: customWord });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.word).toBe(customWord);
      expect(lexicon.hasWord(customWord)).toBe(true);
    });

    it('should dynamically ban an existing word from the active tournament lexicon', async () => {
      const wordToBan = 'TOURNAMENTWORDX';
      const lexicon = LexiconService.getInstance();
      lexicon.addWord(wordToBan);
      expect(lexicon.hasWord(wordToBan)).toBe(true);

      const res = await request(app)
        .post('/api/v1/admin/lexicon/ban-word')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ word: wordToBan, reason: 'Administrative ban test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(lexicon.hasWord(wordToBan)).toBe(false);
    });
  });

  describe('5. Audit Logs Endpoint', () => {
    it('should return chronological administrative audit trail with admin username', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logs).toBeInstanceOf(Array);
      expect(res.body.logs.length).toBeGreaterThan(0);
      expect(res.body.logs[0].adminUsername).toBe('SysAdminChief');
    });
  });
});
