import {
    getExpenseCategoriesReport,
    getMonthlySummaryReport,
    getSummaryReport
} from '../services/report.service.js';

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

export async function getSummary(req, res) {
    try {
        const result = await getSummaryReport(req.user.id);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to fetch summary');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to fetch summary');
    }
}

export async function getMonthlySummary(req, res) {
    try {
        const result = await getMonthlySummaryReport(req.user.id, req.query.month);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to fetch monthly summary');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to fetch monthly summary');
    }
}

export async function getCategories(req, res) {
    try {
        const result = await getExpenseCategoriesReport(req.user.id);

        if (!result.ok) {
            return sendError(res, result.status || 400, result.message || 'Failed to fetch category report');
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return sendError(res, 500, 'Failed to fetch category report');
    }
}
