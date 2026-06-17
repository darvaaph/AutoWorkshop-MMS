'use strict';

/**
 * Operational error with an HTTP status code. Throw this from controllers/services
 * to return a specific status + user-facing message through the global error
 * handler, e.g. `throw new AppError(400, 'Vehicle not found')`.
 *
 * `isOperational` distinguishes expected business errors (don't log a stack)
 * from unexpected programmer/infrastructure errors (do log).
 */
class AppError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code || 'APP_ERROR';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
