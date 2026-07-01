'use strict';

/**
 * Canonical domain constants for the API. Import these instead of hardcoding
 * status/type string literals so a typo fails loudly at require-time rather
 * than silently mismatching a string comparison.
 */

// ── Transaction lifecycle ──
const TRANSACTION_STATUS = Object.freeze({
    PENDING: 'PENDING',     // open "bon sementara / rawat inap" — not a sale yet
    UNPAID: 'UNPAID',
    PARTIAL: 'PARTIAL',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
});

// Statuses an open bill may be edited in (POS "rawat inap" flow).
const EDITABLE_STATUSES = Object.freeze([
    TRANSACTION_STATUS.PENDING,
    TRANSACTION_STATUS.UNPAID,
    TRANSACTION_STATUS.PARTIAL,
]);

// Transactions counted as finalized sales/revenue across reports & dashboard.
// Excludes PENDING (not a sale until closed) and CANCELLED.
const SALE_STATUSES = Object.freeze([
    TRANSACTION_STATUS.UNPAID,
    TRANSACTION_STATUS.PARTIAL,
    TRANSACTION_STATUS.PAID,
]);

// ── Line-item types ──
const ITEM_TYPE = Object.freeze({
    PRODUCT: 'PRODUCT',
    SERVICE: 'SERVICE',
    PACKAGE: 'PACKAGE',
    EXTERNAL: 'EXTERNAL',
});

// ── Inventory ledger ──
const INVENTORY_TYPE = Object.freeze({ IN: 'IN', OUT: 'OUT' });
const INVENTORY_REFERENCE = Object.freeze({
    TRANSACTION: 'TRANSACTION',
    RETURN: 'RETURN',
    PURCHASE: 'PURCHASE',
    ADJUSTMENT: 'ADJUSTMENT',
});

// ── Payments ──
const PAYMENT_METHOD = Object.freeze({
    CASH: 'CASH',
    TRANSFER: 'TRANSFER',
    QRIS: 'QRIS',
    DEBIT: 'DEBIT',
    CREDIT: 'CREDIT',
    OTHER: 'OTHER',
    REFUND: 'REFUND',
});

// ── Service-reminder business rules (spec.md Section 3.G) ──
const SERVICE_INTERVAL_MONTHS = 3;   // next service date = transaction date + 3 months
const SERVICE_INTERVAL_KM = 2000;    // next service km   = current km + 2,000 km

// ── Misc limits ──
const MAX_ITEMS_PER_TRANSACTION = 50;

module.exports = {
    TRANSACTION_STATUS,
    EDITABLE_STATUSES,
    SALE_STATUSES,
    ITEM_TYPE,
    INVENTORY_TYPE,
    INVENTORY_REFERENCE,
    PAYMENT_METHOD,
    SERVICE_INTERVAL_MONTHS,
    SERVICE_INTERVAL_KM,
    MAX_ITEMS_PER_TRANSACTION,
};
