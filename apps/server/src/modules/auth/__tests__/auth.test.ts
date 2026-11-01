import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { closeDb, getDb } from '../../../db/index.js';

describe('Auth Module Integration Tests', () => {
  beforeAll(async () => {
    await getDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  const testUser = {
    email: 'scholar@wordchain.gg',
    username: 'WordScholar',
    password: 'ValidPassword123!',
  };

  let verificationToken: string;
  let authTokenCookie: string;

  it('POST /api/v1/auth/register should create a user and initialize Academic Rank at Nursery III', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.emailVerified).toBe(false);

    // Verify academic rank initialization
    expect(res.body.user.currentRank).toBeDefined();
    expect(res.body.user.currentRank.tier).toBe('NURSERY');
    expect(res.body.user.currentRank.division).toBe(3);
    expect(res.body.user.currentRank.rankExp).toBe(0);
    expect(res.body.user.currentRank.hiddenMmr).toBe(1000);

    // Verify player profile initialization
    expect(res.body.user.profile.accountLevel).toBe(1);
    expect(res.body.user.profile.totalMatches).toBe(0);

    // Capture verification token for subsequent test
    expect(res.body.verificationToken).toBeDefined();
    verificationToken = res.body.verificationToken;

    // Check auth cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authTokenCookie = cookies[0];
  });

  it('POST /api/v1/auth/register should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUser.email,
        username: 'DifferentName',
        password: 'ValidPassword123!',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('email already exists');
  });

  it('POST /api/v1/auth/register should reject duplicate username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'other@wordchain.gg',
        username: testUser.username,
        password: 'ValidPassword123!',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Username is already taken');
  });

  it('POST /api/v1/auth/register should reject invalid password (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'short@wordchain.gg',
        username: 'ShortPass',
        password: 'short',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors.password).toBeDefined();
  });

  it('POST /api/v1/auth/login should authenticate by username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.username,
        password: testUser.password,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/v1/auth/login should authenticate by email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('POST /api/v1/auth/login should reject incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me should return authenticated profile when cookie is present', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authTokenCookie)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.currentRank.tier).toBe('NURSERY');
  });

  it('GET /api/v1/auth/me should return 401 when no token is provided', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/verify-email should verify the account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify that me endpoint now reports emailVerified = true
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authTokenCookie)
      .expect(200);

    expect(meRes.body.user.emailVerified).toBe(true);
  });

  it('POST /api/v1/auth/forgot-password and reset-password flow', async () => {
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    expect(forgotRes.body.success).toBe(true);
    const resetToken = forgotRes.body.resetToken;
    expect(resetToken).toBeDefined();

    const newPassword = 'NewlyUpdatedPassword2026!';
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword })
      .expect(200);

    expect(resetRes.body.success).toBe(true);

    // Verify login with new password
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        emailOrUsername: testUser.email,
        password: newPassword,
      })
      .expect(200);
  });
});
