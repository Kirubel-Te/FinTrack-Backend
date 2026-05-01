import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import logger from '../utils/logger.js';

function sendErrorResponse(res, statusCode, message) {
    return res.status(statusCode).json({
        success: false,
        message
    });
}

function formatZodMessage(error) {
    if (!error.issues || error.issues.length === 0) {
        return 'Invalid request data';
    }

    return error.issues
        .map((issue) => {
            const path = issue.path.length ? issue.path.join('.') : 'value';
            return `${path}: ${issue.message}`;
        })
        .join('; ');
}

export function errorMiddleware(error, _req, res, _next) {
    if (error instanceof ZodError) {
        return sendErrorResponse(res, 400, formatZodMessage(error));
    }

    if (error instanceof AppError) {
        return sendErrorResponse(res, error.statusCode, error.message);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 409, 'Resource already exists');
        }

        if (error.code === 'P2025') {
            return sendErrorResponse(res, 404, 'Resource not found');
        }

        return sendErrorResponse(res, 400, 'Database request failed');
    }

    if (
        error instanceof Prisma.PrismaClientValidationError ||
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientRustPanicError
    ) {
        const statusCode = error instanceof Prisma.PrismaClientValidationError ? 400 : 500;
        const message = statusCode === 400 ? 'Database validation failed' : 'Database error';

        return sendErrorResponse(res, statusCode, message);
    }

    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return sendErrorResponse(res, 401, 'Invalid or expired token');
    }

    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message && statusCode < 500 ? error.message : 'Internal server error';

    if (statusCode >= 500) {
        logger.error(error);
    }

    return sendErrorResponse(res, statusCode, message);
}
