import { z } from 'zod';
import { transactionListQuerySchema, uuidParamSchema } from './common.validation.js';

const amountSchema = z.preprocess((value) => Number(value), z.number().positive('amount must be a positive number'));

const categorySchema = z.string().trim().min(1, 'category must be non-empty');

const dateSchema = z
    .coerce
    .date()
    .refine((date) => !Number.isNaN(date.getTime()), 'date must be a valid date');

const descriptionSchema = z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
        if (value === null || value === undefined) {
            return null;
        }

        const trimmed = value.trim();
        return trimmed || null;
    });

const expenseBodySchema = z.object({
    amount: amountSchema,
    category: categorySchema,
    date: dateSchema,
    description: descriptionSchema
});

const updateExpenseBodySchema = expenseBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required to update'
    });

export const listExpensesSchema = z.object({
    query: transactionListQuerySchema
});

export const getExpenseSchema = z.object({
    params: uuidParamSchema
});

export const createExpenseSchema = z.object({
    body: expenseBodySchema
});

export const updateExpenseSchema = z.object({
    params: uuidParamSchema,
    body: updateExpenseBodySchema
});

export const deleteExpenseSchema = z.object({
    params: uuidParamSchema
});
