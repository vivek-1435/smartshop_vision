/**
 * SmartShop API Tests
 * Run: npm test
 * Requires: MONGODB_URI_TEST env var (uses in-memory if not set)
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');

// ── Test DB setup ─────────────────────────────────────────────────
const TEST_DB = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/smartshop_test';

let token;
let shopId;
let productId;
let billId;

const SHOPKEEPER = {
  shopName: 'Test Auto Shop',
  ownerName: 'Test Owner',
  email: `test_${Date.now()}@example.com`,
  password: 'TestPass123',
  upiId: 'test@okaxis',
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long!!';
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  // Clean up test data
  const Shopkeeper = require('../src/models/Shopkeeper');
  await Shopkeeper.deleteMany({ email: SHOPKEEPER.email });
  await mongoose.connection.close();
});

// ── Auth ──────────────────────────────────────────────────────────
describe('Auth', () => {
  test('POST /api/auth/register — creates shopkeeper', async () => {
    const res = await request(app).post('/api/auth/register').send(SHOPKEEPER);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.shopkeeper.email).toBe(SHOPKEEPER.email);
    token  = res.body.token;
    shopId = res.body.shopkeeper.shopId;
  });

  test('POST /api/auth/register — rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(SHOPKEEPER);
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register — rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...SHOPKEEPER, password: '123', email: 'other@x.com' });
    expect(res.status).toBe(422);
  });

  test('POST /api/auth/login — returns token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: SHOPKEEPER.email, password: SHOPKEEPER.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/auth/login — rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: SHOPKEEPER.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me — returns current user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.shopkeeper.email).toBe(SHOPKEEPER.email);
  });

  test('GET /api/auth/me — rejects no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Shop ──────────────────────────────────────────────────────────
describe('Shop', () => {
  test('GET /api/shop/dashboard — returns stats', async () => {
    const res = await request(app).get('/api/shop/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
  });

  test('GET /api/shop/qr — returns QR URL', async () => {
    const res = await request(app).get('/api/shop/qr').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.qrUrl).toContain(shopId);
  });

  test('GET /api/shop/public/:shopId — returns public info', async () => {
    const res = await request(app).get(`/api/shop/public/${shopId}`);
    expect(res.status).toBe(200);
    expect(res.body.shop.shopName).toBe(SHOPKEEPER.shopName);
  });

  test('GET /api/shop/public/invalid-shop-id — 404', async () => {
    const res = await request(app).get('/api/shop/public/does-not-exist-xyz');
    expect(res.status).toBe(404);
  });
});

// ── Bills ─────────────────────────────────────────────────────────
describe('Bills', () => {
  test('POST /api/bills — creates bill', async () => {
    const res = await request(app).post('/api/bills').send({
      shopId,
      items: [{ name: 'Engine Oil', price: 350, qty: 2 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.bill.total).toBeGreaterThan(0);
    billId = res.body.bill._id;
  });

  test('POST /api/bills — rejects empty items', async () => {
    const res = await request(app).post('/api/bills').send({ shopId, items: [] });
    expect(res.status).toBe(422);
  });

  test('GET /api/bills/:id — returns bill', async () => {
    const res = await request(app).get(`/api/bills/${billId}`);
    expect(res.status).toBe(200);
    expect(res.body.bill._id).toBe(billId);
  });

  test('PATCH /api/bills/:id/payment — marks paid', async () => {
    const res = await request(app).patch(`/api/bills/${billId}/payment`).send({ paymentMethod: 'upi', upiTransactionId: 'TXN123' });
    expect(res.status).toBe(200);
    expect(res.body.bill.paymentStatus).toBe('paid');
  });

  test('GET /api/bills — lists bills (auth)', async () => {
    const res = await request(app).get('/api/bills').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.bills.length).toBeGreaterThan(0);
  });
});

// ── Analytics ─────────────────────────────────────────────────────
describe('Analytics', () => {
  test('GET /api/analytics?period=week', async () => {
    const res = await request(app).get('/api/analytics?period=week').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('topProducts');
  });

  test('GET /api/analytics — invalid period', async () => {
    const res = await request(app).get('/api/analytics?period=decade').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
  });
});

// ── Health ────────────────────────────────────────────────────────
describe('Health', () => {
  test('GET /health — ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
