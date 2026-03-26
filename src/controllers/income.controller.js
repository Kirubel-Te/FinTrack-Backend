import {
    createIncome,
    deleteIncome,
    getIncomeById,
    listIncomes,
    updateIncome
} from '../services/income.service.js';
import { parseTransactionListQueryParams } from '../utils/list-query.js';

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

export async function getIncomes(req, res) {
    try {
        const parsedQuery = parseTransactionListQueryParams(req.query);

        if (!parsedQuery.ok) {
            return sendError(res, parsedQuery.status || 400, parsedQuery.message || 'Invalid query params');
        }

        const result = await listIncomes(req.user.id, parsedQuery.data);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to fetch incomes');
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
        return sendError(res, 500, 'Failed to fetch incomes');
    }
}

export async function getIncome(req, res) {
    try {
        const result = await getIncomeById(req.user.id, req.params.id);

        if (!result.ok) {
            return sendError(res, result.status || 404, result.message || 'Income not found');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to fetch income');
    }
}

export async function createIncomeHandler(req, res) {
    try {
        const result = await createIncome(req.user.id, req.body);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to create income');
        }

        return res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to create income');
    }
}

export async function updateIncomeHandler(req, res) {
    try {
        const result = await updateIncome(req.user.id, req.params.id, req.body);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to update income');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to update income');
    }
}

export async function deleteIncomeHandler(req, res) {
    try {
        const result = await deleteIncome(req.user.id, req.params.id);

        if (!result.ok) {
            return sendError(res, result.status || 404, result.message || 'Failed to delete income');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to delete income');
    }
}