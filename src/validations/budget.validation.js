import { z } from 'zod';
import { uuidParamSchema } from './common.validation.js';
import { EXPENSE_CATEGORIES, normalizeExpenseCategory } from '../constants/expense-categories.js';

const periodSchema = z.enum(['monthly'], {
    message: 'period must be monthly'
});

const categorySchema = z
    .string()
    .trim()
    .min(1, 'category is required')
    .transform((value) => normalizeExpenseCategory(value))
    .refine((value) => EXPENSE_CATEGORIES.includes(value), {
        message: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
    });

const monthSchema = z
    .preprocess((value) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        return Number(value);
    }, z.number().int().min(1).max(12))
    .optional();

const yearSchema = z
    .preprocess((value) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        return Number(value);
    }, z.number().int().min(2000).max(3000))
    .optional();

const amountSchema = z.preprocess((value) => Number(value), z.number().positive('amount must be a positive number'));

const budgetBodySchema = z.object({
    amount: amountSchema,
    period: periodSchema,
    category: categorySchema,
    month: monthSchema,
    year: yearSchema
});

export const createBudgetSchema = z.object({
    body: budgetBodySchema
});

export const listBudgetsSchema = z.object({
    query: z.object({
        period: periodSchema.optional(),
        category: categorySchema.optional(),
        month: monthSchema,
        year: yearSchema
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
        category: categorySchema.optional(),
        month: monthSchema,
        year: yearSchema
    })
});
