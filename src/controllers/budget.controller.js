import { AppError } from '../errors/app-error.js';
import {
    createBudget,
    deleteBudget,
    getBudgetSummary,
    listBudgets,
    updateBudget
} from '../services/budget.service.js';

export async function createBudgetHandler(req, res, next) {
    try {
        const result = await createBudget(req.user.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to create budget', result.status || 400);
        }

        return res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function getBudgetsHandler(req, res, next) {
    try {
        const query = req.validated?.query || req.query;
        const result = await listBudgets(req.user.id, query);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch budgets', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function updateBudgetHandler(req, res, next) {
    try {
        const result = await updateBudget(req.user.id, req.params.id, req.body);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to update budget', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function deleteBudgetHandler(req, res, next) {
    try {
        const result = await deleteBudget(req.user.id, req.params.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to delete budget', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function getBudgetSummaryHandler(req, res, next) {
    try {
        const query = req.validated?.query || req.query;
        const result = await getBudgetSummary(req.user.id, query);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch budget summary', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}
