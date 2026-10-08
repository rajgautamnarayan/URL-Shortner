const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.BASE_URL = 'http://localhost:3000';

const { app } = require('../backend/server');

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('health endpoint reports a running server', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, 'Server is running');
});

test('home page is served by the same application', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.match(response.text, /Shorten Your URLs/);
});

test('unknown API routes return JSON 404', async () => {
  const response = await request(app).get('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'API endpoint not found');
});

test('a user can register, shorten a URL, and follow the redirect', async () => {
  const register = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'Secure123' });

  assert.equal(register.status, 201);
  const token = register.body.data.token;

  const shortened = await request(app)
    .post('/api/shorten')
    .set('Authorization', `Bearer ${token}`)
    .send({ originalUrl: 'https://example.com/a/long/path' });

  assert.equal(shortened.status, 201);
  assert.match(shortened.body.data.shortCode, /^[A-Za-z0-9_-]{7}$/);

  const redirect = await request(app).get(`/${shortened.body.data.shortCode}`);
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.location, 'https://example.com/a/long/path');
});
