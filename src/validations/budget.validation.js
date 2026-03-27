import { z } from 'zod';
import { uuidParamSchema } from './common.validation.js';

const periodSchema = z.enum(['monthly'], {
    message: 'period must be monthly'
});

const categorySchema = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
        if (value === null || value === undefined) {
            return null;
        }

        const trimmed = value.trim();
        return trimmed || null;
    });

const amountSchema = z.preprocess((value) => Number(value), z.number().positive('amount must be a positive number'));

const budgetBodySchema = z.object({
    amount: amountSchema,
    period: periodSchema,
    category: categorySchema
});

export const createBudgetSchema = z.object({
    body: budgetBodySchema
});

export const listBudgetsSchema = z.object({
    query: z.object({
        period: periodSchema.optional(),
        category: categorySchema
    })
});

export const updateBudgetSchema = z.object({
    params: uuidParamSchema,
    body: budgetBodySchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required to update' })
});

export const deleteBudgetSchema = z.object({
    params: uuidParamSchema
});

export const budgetSummarySchema = z.object({
    query: z.object({
        period: periodSchema.optional(),
        category: categorySchema
    })
});
