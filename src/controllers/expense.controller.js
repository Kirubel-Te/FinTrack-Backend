import {
    createExpense,
    deleteExpense,
    getExpenseById,
    listExpenses,
    updateExpense
} from '../services/expense.service.js';
import { parseTransactionListQueryParams } from '../utils/list-query.js';

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

export async function getExpenses(req, res) {
    try {
        const parsedQuery = parseTransactionListQueryParams(req.query);

        if (!parsedQuery.ok) {
            return sendError(res, parsedQuery.status || 400, parsedQuery.message || 'Invalid query params');
        }

        const result = await listExpenses(req.user.id, parsedQuery.data);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to fetch expenses');
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
        return sendError(res, 500, 'Failed to fetch expenses');
    }
}

export async function getExpense(req, res) {
    try {
        const result = await getExpenseById(req.user.id, req.params.id);

        if (!result.ok) {
            return sendError(res, result.status || 404, result.message || 'Expense not found');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to fetch expense');
    }
}

export async function createExpenseHandler(req, res) {
    try {
        const result = await createExpense(req.user.id, req.body);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to create expense');
        }

        return res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to create expense');
    }
}

export async function updateExpenseHandler(req, res) {
    try {
        const result = await updateExpense(req.user.id, req.params.id, req.body);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to update expense');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to update expense');
    }
}

export async function deleteExpenseHandler(req, res) {
    try {
        const result = await deleteExpense(req.user.id, req.params.id);

        if (!result.ok) {
            return sendError(res, result.status || 404, result.message || 'Failed to delete expense');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to delete expense');
    }
}