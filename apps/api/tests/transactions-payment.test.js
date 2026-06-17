'use strict';

// Integration tests for the POS transaction + payment lifecycle.
// Focuses on the behaviours hardened in the 2026-06 API audit:
//   - cash overpayment is capped (not stored as inflated revenue)
//   - status transitions UNPAID -> PARTIAL -> PAID
//   - a fully-paid / cancelled bill rejects further payment
//   - cancel restores stock and records a negative REFUND payment
//
// Each test builds the minimal data it needs against a fresh test database.

const request = require('supertest');
const jwt = require('jsonwebtoken');

const { resetDatabase, closeDatabase, db } = require('./helpers/db');
const { User, Product, Transaction, Payment } = db;
const app = require('../src/app');

// ---- factories (unique-per-call so rows never collide across tests) ----
let seq = 0;

async function makeUser(overrides = {}) {
    seq += 1;
    return User.create({
        username: overrides.username || `cashier_${seq}`,
        password: 'not-used-login-is-bypassed',
        role: overrides.role || 'ADMIN',
        full_name: 'Test User',
        is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    });
}

// verifyToken only needs a real, active user row matching the token's id.
function tokenFor(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function makeProduct(overrides = {}) {
    seq += 1;
    return Product.create({
        sku: overrides.sku || `SKU_${seq}`,
        name: overrides.name || `Produk ${seq}`,
        category: 'PART',
        price_buy: overrides.price_buy ?? 6000,
        price_sell: overrides.price_sell ?? 10000,
        stock: overrides.stock ?? 100,
        min_stock_alert: 5,
    });
}

// A bare open bill (no items) — enough to exercise the payment endpoint directly.
async function makeOpenTransaction(overrides = {}) {
    const total = overrides.total ?? 100000;
    return Transaction.create({
        user_id: admin.id,
        vehicle_id: null,
        mechanic_id: null,
        date: new Date(),
        status: overrides.status || 'UNPAID',
        subtotal: total,
        discount_amount: 0,
        total_amount: total,
        current_km: null,
        notes: null,
    });
}

let admin;
let token;

beforeAll(async () => {
    await resetDatabase();
    admin = await makeUser({ role: 'ADMIN' });
    token = tokenFor(admin);
});

afterAll(async () => {
    await closeDatabase();
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Auth guard', () => {
    test('menolak akses tanpa token', async () => {
        const res = await request(app).get('/api/transactions');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/transactions — buat transaksi', () => {
    test('penjualan produk: stok berkurang, status UNPAID', async () => {
        const product = await makeProduct({ stock: 10, price_sell: 10000 });

        const res = await auth(request(app).post('/api/transactions')).send({
            items: [{ item_type: 'PRODUCT', item_id: product.id, qty: 2 }],
        });

        expect(res.status).toBe(201);
        expect(res.body.data.summary.total).toBe(20000);
        expect(res.body.data.summary.status).toBe('UNPAID');

        const after = await Product.findByPk(product.id);
        expect(after.stock).toBe(8);
    });

    test('initial_payment lunas -> status PAID', async () => {
        const product = await makeProduct({ stock: 5, price_sell: 10000 });

        const res = await auth(request(app).post('/api/transactions')).send({
            items: [{ item_type: 'PRODUCT', item_id: product.id, qty: 1 }],
            initial_payment: { amount: 10000, payment_method: 'CASH' },
        });

        expect(res.status).toBe(201);
        expect(res.body.data.summary.status).toBe('PAID');
        expect(res.body.data.summary.paid).toBe(10000);
        expect(res.body.data.summary.remaining).toBe(0);
    });

    test('overpayment saat create di-cap ke total (bukan disimpan utuh)', async () => {
        const product = await makeProduct({ stock: 5, price_sell: 10000 });

        const res = await auth(request(app).post('/api/transactions')).send({
            items: [{ item_type: 'PRODUCT', item_id: product.id, qty: 1 }],
            initial_payment: { amount: 50000, payment_method: 'CASH' },
        });

        expect(res.status).toBe(201);
        expect(res.body.data.summary.status).toBe('PAID');
        expect(res.body.data.summary.paid).toBe(10000); // capped, not 50000

        const trxId = res.body.data.transaction.id;
        const payments = await Payment.findAll({ where: { transaction_id: trxId } });
        expect(payments).toHaveLength(1);
        expect(Number(payments[0].amount)).toBe(10000);
    });
});

describe('POST /api/transactions/:id/pay — tambah pembayaran', () => {
    test('bayar sebagian -> PARTIAL, lalu pelunasan -> PAID', async () => {
        const trx = await makeOpenTransaction({ total: 100000 });

        const partial = await auth(
            request(app).post(`/api/transactions/${trx.id}/pay`)
        ).send({ amount: 40000, payment_method: 'CASH' });

        expect(partial.status).toBe(201);
        expect(partial.body.data.payment_summary.status).toBe('PARTIAL');
        expect(partial.body.data.payment_summary.remaining).toBe(60000);

        const full = await auth(
            request(app).post(`/api/transactions/${trx.id}/pay`)
        ).send({ amount: 60000, payment_method: 'CASH' });

        expect(full.status).toBe(201);
        expect(full.body.data.payment_summary.status).toBe('PAID');
        expect(full.body.data.payment_summary.remaining).toBe(0);
    });

    test('overpayment di-cap ke sisa tagihan', async () => {
        const trx = await makeOpenTransaction({ total: 50000 });

        const res = await auth(
            request(app).post(`/api/transactions/${trx.id}/pay`)
        ).send({ amount: 80000, payment_method: 'CASH' });

        expect(res.status).toBe(201);
        expect(res.body.data.payment_summary.status).toBe('PAID');
        expect(res.body.data.payment_summary.total_paid).toBe(50000);
        expect(res.body.data.payment_summary.remaining).toBe(0);

        const payments = await Payment.findAll({ where: { transaction_id: trx.id } });
        expect(Number(payments[0].amount)).toBe(50000); // stored = remaining, not 80000
    });

    test('menolak pembayaran untuk transaksi yang sudah PAID', async () => {
        const trx = await makeOpenTransaction({ total: 50000, status: 'PAID' });

        const res = await auth(
            request(app).post(`/api/transactions/${trx.id}/pay`)
        ).send({ amount: 10000, payment_method: 'CASH' });

        expect(res.status).toBe(400);
    });

    test('menolak pembayaran untuk transaksi 404', async () => {
        const res = await auth(
            request(app).post('/api/transactions/999999/pay')
        ).send({ amount: 10000, payment_method: 'CASH' });

        expect(res.status).toBe(404);
    });
});

describe('PUT /api/transactions/:id/cancel — pembatalan', () => {
    test('membatalkan transaksi lunas: stok dikembalikan + ada REFUND negatif', async () => {
        const product = await makeProduct({ stock: 10, price_sell: 10000 });

        const created = await auth(request(app).post('/api/transactions')).send({
            items: [{ item_type: 'PRODUCT', item_id: product.id, qty: 2 }],
            initial_payment: { amount: 20000, payment_method: 'CASH' },
        });
        expect(created.status).toBe(201);
        const trxId = created.body.data.transaction.id;

        // stock deducted 10 -> 8
        expect((await Product.findByPk(product.id)).stock).toBe(8);

        const cancel = await auth(
            request(app).put(`/api/transactions/${trxId}/cancel`)
        ).send({ reason: 'uji batal' });

        expect(cancel.status).toBe(200);
        expect(cancel.body.data.transaction.status).toBe('CANCELLED');
        expect(cancel.body.data.refunded_amount).toBe(20000);

        // stock restored 8 -> 10
        expect((await Product.findByPk(product.id)).stock).toBe(10);

        // a negative REFUND payment now exists, netting paid to zero
        const payments = await Payment.findAll({ where: { transaction_id: trxId } });
        const net = payments.reduce((s, p) => s + Number(p.amount), 0);
        expect(net).toBe(0);
        expect(payments.some((p) => p.payment_method === 'REFUND' && Number(p.amount) === -20000)).toBe(true);
    });
});
