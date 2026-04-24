import { z } from 'zod';
import { transactionListQuerySchema } from './common.validation.js';

export const monthlyReportSchema = z.object({
    query: z.object({
        month: z
            .string({
                required_error: 'month is required'
            })
            .trim()
            .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
    })
});

const transactionSearchKeywordSchema = z.preprocess((value) => {
    if (Array.isArray(value) || typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}, z.string().min(1).max(100).optional());

export const transactionSearchSchema = z.object({
    query: transactionListQuerySchema.and(
        z.object({
            keyword: transactionSearchKeywordSchema
        })
    )
});
