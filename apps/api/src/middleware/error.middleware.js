'use strict';

/**
 * Centralized error handler.
 *
 * Controllers wrap their async logic in `asyncHandler` and simply `throw`
 * (an `AppError` for expected business errors, or any Error for unexpected
 * failures). This maps well-known error types to a consistent JSON shape so
 * the per-method try/catch boilerplate no longer has to.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || err.name || 'INTERNAL_ERROR';

    // ── Map Sequelize errors to descriptive 400s ──
    if (err.name === 'SequelizeValidationError') {
        statusCode = 400;
        message = `Validation Error: ${err.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`;
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 400;
        message = `Duplicate entry: ${err.errors[0]?.message || 'unique constraint violated'}`;
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400;
        message = `Invalid reference in ${err.table || 'related record'}`;
    } else if (err.name === 'SequelizeConnectionError') {
        statusCode = 503;
        message = 'Database connection error. Please try again later.';
    }

    // Only unexpected (5xx) errors warrant a stack trace in the logs.
    if (statusCode >= 500) {
        console.error('❌ Error:', { method: req.method, url: req.originalUrl, message: err.message });
        if (err.stack) console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: err.message,
        code,
    });
}

module.exports = errorHandler;
