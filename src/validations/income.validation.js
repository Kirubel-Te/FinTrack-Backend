import { z } from 'zod';
import { transactionListQuerySchema, uuidParamSchema } from './common.validation.js';

const amountSchema = z.preprocess((value) => Number(value), z.number().positive('amount must be a positive number'));

const categorySchema = z.string().trim().min(1, 'category must be non-empty');

const dateSchema = z
    .coerce
    .date({
        error: 'date must be a valid date'
    })
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

const incomeBodySchema = z.object({
    amount: amountSchema,
    category: categorySchema,
    date: dateSchema,
    description: descriptionSchema
});

const updateIncomeBodySchema = incomeBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field is required to update'
    });

export const listIncomesSchema = z.object({
    query: transactionListQuerySchema
});

export const getIncomeSchema = z.object({
    params: uuidParamSchema
});

export const createIncomeSchema = z.object({
    body: incomeBodySchema
});

export const updateIncomeSchema = z.object({
    params: uuidParamSchema,
    body: updateIncomeBodySchema
});

export const deleteIncomeSchema = z.object({
    params: uuidParamSchema
});
