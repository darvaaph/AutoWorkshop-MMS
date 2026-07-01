module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    // DB integration tests share one physical test database, so run serially.
    maxWorkers: 1,
    testTimeout: 30000,
    // The mysql2 pool can keep the event loop alive briefly after afterAll closes it;
    // forceExit guarantees Jest terminates cleanly.
    forceExit: true,
};
