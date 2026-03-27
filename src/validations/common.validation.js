import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function trimToUndefined(value) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}

function parsePositiveIntegerOrDefault(fieldName, defaultValue) {
    return z.any().transform((value, ctx) => {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }

        if (Array.isArray(value)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be a positive integer`
            });
            return z.NEVER;
        }

        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be a positive integer`
            });
            return z.NEVER;
        }

        return parsed;
    });
}

function parseDateStringOptional(fieldName) {
    return z.any().transform((value, ctx) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        if (Array.isArray(value)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be valid`
            });
            return z.NEVER;
        }

        const normalized = trimToUndefined(value);

        if (!normalized) {
            return undefined;
        }

        const parsedDate = new Date(normalized);
        if (Number.isNaN(parsedDate.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${fieldName} must be valid`
            });
            return z.NEVER;
        }

        return normalized;
    });
}

export const uuidParamSchema = z.object({
    id: z.string().uuid('id must be a valid UUID')
});

export const transactionListQuerySchema = z
    .object({
        page: parsePositiveIntegerOrDefault('page', DEFAULT_PAGE),
        limit: parsePositiveIntegerOrDefault('limit', DEFAULT_LIMIT),
        category: z.preprocess((value) => {
            if (Array.isArray(value)) {
                return Number.NaN;
            }

            return trimToUndefined(value);
        }, z.string().min(1, 'category must be non-empty').optional()),
        startDate: parseDateStringOptional('startDate'),
        endDate: parseDateStringOptional('endDate')
    })
    .transform((query) => ({
        ...query,
        limit: Math.min(query.limit, MAX_LIMIT)
    }))
    .superRefine((query, ctx) => {
        if (!query.startDate || !query.endDate) {
            return;
        }

        const start = new Date(query.startDate);
        const end = new Date(query.endDate);

        if (start > end) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['startDate'],
                message: 'startDate cannot be greater than endDate'
            });
        }
    });
