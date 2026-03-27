import {
    createExpense,
    deleteExpense,
    getExpenseById,
    listExpenses,
    updateExpense
} from '../services/expense.service.js';
import { AppError } from '../errors/app-error.js';

export async function getExpenses(req, res, next) {
    try {
        const query = req.validated?.query || req.query;
        const result = await listExpenses(req.user.id, query);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch expenses', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            meta: {
                page: result.meta.page,
                limit: result.meta.limit,
                total: result.meta.total,
                totalPages: result.meta.totalPages
            }
        });
    } catch (error) {
        return next(error);
    }
}

export async function getExpense(req, res, next) {
    try {
        const result = await getExpenseById(req.user.id, req.params.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Expense not found', result.status || 404);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function createExpenseHandler(req, res, next) {
    try {
        const result = await createExpense(req.user.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to create expense', result.status || 400);
        }

        return res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function updateExpenseHandler(req, res, next) {
    try {
        const result = await updateExpense(req.user.id, req.params.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to update expense', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function deleteExpenseHandler(req, res, next) {
    try {
        const result = await deleteExpense(req.user.id, req.params.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to delete expense', result.status || 404);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}