'use strict';

// Test database helper.
//
// Requiring `../../src/models` (the index) both loads every model AND wires the
// associations (`as: 'items'`, `as: 'payments'`, ...) onto the shared Sequelize
// instance — the same instances the controllers import. With NODE_ENV=test,
// config/database.js points that instance at `<DB_NAME>_test` (never dev/prod).

require('dotenv').config();

const db = require('../../src/models');
const { sequelize } = db;

/**
 * Drop and recreate every table from the model definitions, giving each test
 * run a clean, known schema. Built from models (not migrations) so the suite is
 * self-contained — no separate migrate step required.
 */
async function resetDatabase() {
    await sequelize.sync({ force: true });
}

/** Close the connection so Jest can exit cleanly. */
async function closeDatabase() {
    await sequelize.close();
}

module.exports = { db, sequelize, resetDatabase, closeDatabase };
