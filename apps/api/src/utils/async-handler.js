'use strict';

/**
 * Wrap an async Express handler so any thrown error or rejected promise is
 * forwarded to the centralized error middleware via `next(err)`, instead of
 * being caught and shaped by hand in every controller method.
 *
 *   exports.getThing = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
