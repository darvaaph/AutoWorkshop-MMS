'use strict';

// Integration tests for editing an open bill (PUT /api/transactions/:id —
// "bon sementara / rawat inap"). These pin the edit-flow behaviour BEFORE the
// updateTransaction god-function is split into helpers, so the refactor is safe:
//   - add a new line item -> totals recompute, new product stock deducted
//   - change qty -> stock adjusted by the TRUE delta (net), not re-deducted
//   - omit an item -> removed, its stock returned
//   - PACKAGE lines are immutable (cannot change qty or be removed via edit)
//   - only PENDING/UNPAID/PARTIAL bills are editable (PAID rejected)
//   - status recomputes against existing payments (PARTIAL -> PAID on shrink)
//   - empty items payload rejected

const request = require('supertest');
const jwt = require('jsonwebtoken');

const { resetDatabase, closeDatabase, db } = require('./helpers/db');
const { User, Product, Package, PackageItem } = db;
const app = require('../src/app');

let seq = 0;

async function makeUser(overrides = {}) {
    seq += 1;
    return User.create({
        username: overrides.username || `cashier_u_${seq}`,
        password: 'not-used-login-is-bypassed',
        role: overrides.role || 'ADMIN',
        full_name: 'Test User',
        is_active: true,
    });
}

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
        sku: overrides.sku || `SKU_U_${seq}`,
        name: overrides.name || `Produk ${seq}`,
        category: 'PART',
        price_buy: overrides.price_buy ?? 6000,
        price_sell: overrides.price_sell ?? 10000,
        stock: overrides.stock ?? 100,
        min_stock_alert: 5,
    });
}

async function makePackageWithProduct(productId, overrides = {}) {
    seq += 1;
    const pkg = await Package.create({
        name: overrides.name || `Paket ${seq}`,
        price: overrides.price ?? 50000,
        description: null,
        is_active: true,
    });
    await PackageItem.create({
        package_id: pkg.id,
        product_id: productId,
        service_id: null,
        qty: overrides.componentQty ?? 1,
    });
    return pkg;
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

// Create a bill via the real POST endpoint and return the parsed body.
async function createBill(body) {
    const res = await auth(request(app).post('/api/transactions')).send(body);
    expect(res.status).toBe(201);
    return res.body.data;
}

const itemRowFor = (data, productId) =>
    data.transaction.items.find((i) => i.item_id === productId);

describe('PUT /api/transactions/:id — edit bon sementara', () => {
    test('tambah item baru: subtotal naik, stok produk baru berkurang', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const b = await makeProduct({ price_sell: 5000, stock: 8 });

        const created = await createBill({
            items: [{ item_type: 'PRODUCT', item_id: a.id, qty: 1 }],
        });
        const trxId = created.transaction.id;
        const itemA = itemRowFor(created, a.id);
        expect((await Product.findByPk(a.id)).stock).toBe(9);

        const res = await auth(request(app).put(`/api/transactions/${trxId}`)).send({
            items: [
                { id: itemA.id, qty: 1 },
                { item_type: 'PRODUCT', item_id: b.id, qty: 2 },
            ],
        });

        expect(res.status).toBe(200);
        expect(res.body.data.summary.total).toBe(20000); // 10000 + 2*5000
        expect(res.body.data.summary.status).toBe('UNPAID');
        expect((await Product.findByPk(b.id)).stock).toBe(6); // 8 - 2
        expect((await Product.findByPk(a.id)).stock).toBe(9); // unchanged
    });

    test('naikkan qty: stok dipotong hanya sebesar delta', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const created = await createBill({
            items: [{ item_type: 'PRODUCT', item_id: a.id, qty: 1 }],
        });
        const trxId = created.transaction.id;
        const itemA = itemRowFor(created, a.id);
        expect((await Product.findByPk(a.id)).stock).toBe(9);

        const res = await auth(request(app).put(`/api/transactions/${trxId}`)).send({
            items: [{ id: itemA.id, qty: 3 }],
        });

        expect(res.status).toBe(200);
        expect(res.body.data.summary.total).toBe(30000);
        expect((await Product.findByPk(a.id)).stock).toBe(7); // 9 - net(+2)
    });

    test('hapus item (tidak dikirim): item dibuang, stok dikembalikan', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const b = await makeProduct({ price_sell: 5000, stock: 8 });
        const created = await createBill({
            items: [
                { item_type: 'PRODUCT', item_id: a.id, qty: 1 },
                { item_type: 'PRODUCT', item_id: b.id, qty: 1 },
            ],
        });
        const trxId = created.transaction.id;
        const itemA = itemRowFor(created, a.id);
        expect((await Product.findByPk(b.id)).stock).toBe(7);

        const res = await auth(request(app).put(`/api/transactions/${trxId}`)).send({
            items: [{ id: itemA.id, qty: 1 }], // omit B -> removed
        });

        expect(res.status).toBe(200);
        expect(res.body.data.summary.total).toBe(10000);
        expect(res.body.data.transaction.items).toHaveLength(1);
        expect((await Product.findByPk(b.id)).stock).toBe(8); // restored 7 -> 8
        expect((await Product.findByPk(a.id)).stock).toBe(9); // unchanged
    });

    test('PACKAGE immutable: tidak bisa ubah qty atau dihapus lewat edit', async () => {
        const c = await makeProduct({ price_sell: 20000, stock: 20 });
        const d = await makeProduct({ price_sell: 7000, stock: 20 });
        const pkg = await makePackageWithProduct(c.id, { price: 50000, componentQty: 1 });

        const created = await createBill({
            items: [{ item_type: 'PACKAGE', item_id: pkg.id, qty: 1 }],
        });
        const trxId = created.transaction.id;
        const pkgRow = created.transaction.items.find((i) => i.item_type === 'PACKAGE');
        expect((await Product.findByPk(c.id)).stock).toBe(19); // component deducted

        // changing package qty is rejected
        const changeQty = await auth(
            request(app).put(`/api/transactions/${trxId}`)
        ).send({ items: [{ id: pkgRow.id, qty: 2 }] });
        expect(changeQty.status).toBe(400);

        // dropping the package (replacing with a product) is rejected
        const dropPkg = await auth(
            request(app).put(`/api/transactions/${trxId}`)
        ).send({ items: [{ item_type: 'PRODUCT', item_id: d.id, qty: 1 }] });
        expect(dropPkg.status).toBe(400);

        // package + its component stock untouched after the rejected edits
        expect((await Product.findByPk(c.id)).stock).toBe(19);
    });

    test('transaksi PAID tidak dapat diedit', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const created = await createBill({
            items: [{ item_type: 'PRODUCT', item_id: a.id, qty: 1 }],
            initial_payment: { amount: 10000, payment_method: 'CASH' },
        });
        expect(created.summary.status).toBe('PAID');
        const itemA = itemRowFor(created, a.id);

        const res = await auth(request(app).put(`/api/transactions/${created.transaction.id}`)).send({
            items: [{ id: itemA.id, qty: 2 }],
        });
        expect(res.status).toBe(400);
    });

    test('payload items kosong ditolak', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const created = await createBill({
            items: [{ item_type: 'PRODUCT', item_id: a.id, qty: 1 }],
        });
        const res = await auth(request(app).put(`/api/transactions/${created.transaction.id}`)).send({
            items: [],
        });
        expect(res.status).toBe(400);
    });

    test('status dihitung ulang vs pembayaran: PARTIAL lalu mengecil jadi PAID', async () => {
        const a = await makeProduct({ price_sell: 10000, stock: 10 });
        const created = await createBill({
            items: [{ item_type: 'PRODUCT', item_id: a.id, qty: 2 }], // total 20000
        });
        const trxId = created.transaction.id;
        const itemA = itemRowFor(created, a.id);
        expect((await Product.findByPk(a.id)).stock).toBe(8);

        const pay = await auth(request(app).post(`/api/transactions/${trxId}/pay`)).send({
            amount: 10000,
            payment_method: 'CASH',
        });
        expect(pay.body.data.payment_summary.status).toBe('PARTIAL');

        // shrink to qty 1 (total 10000) -> existing 10000 payment now fully covers it
        const res = await auth(request(app).put(`/api/transactions/${trxId}`)).send({
            items: [{ id: itemA.id, qty: 1 }],
        });
        expect(res.status).toBe(200);
        expect(res.body.data.summary.total).toBe(10000);
        expect(res.body.data.summary.status).toBe('PAID');
        expect(res.body.data.summary.remaining).toBe(0);
        expect((await Product.findByPk(a.id)).stock).toBe(9); // 8 + net(-1)
    });
});
