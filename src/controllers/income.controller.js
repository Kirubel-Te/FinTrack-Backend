import {
    createIncome,
    deleteIncome,
    getIncomeById,
    listIncomes,
    updateIncome
} from '../services/income.service.js';
import { AppError } from '../errors/app-error.js';

export async function getIncomes(req, res, next) {
    try {
        const query = req.validated?.query || req.query;
        const result = await listIncomes(req.user.id, query);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch incomes', result.status || 400);
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

export async function getIncome(req, res, next) {
    try {
        const result = await getIncomeById(req.user.id, req.params.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Income not found', result.status || 404);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function createIncomeHandler(req, res, next) {
    try {
        const result = await createIncome(req.user.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to create income', result.status || 400);
        }

        return res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function updateIncomeHandler(req, res, next) {
    try {
        const result = await updateIncome(req.user.id, req.params.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to update income', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function deleteIncomeHandler(req, res, next) {
    try {
        const result = await deleteIncome(req.user.id, req.params.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to delete income', result.status || 404);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}