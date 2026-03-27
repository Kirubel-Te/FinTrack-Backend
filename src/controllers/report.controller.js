import {
    getExpenseCategoriesReport,
    getMonthlySummaryReport,
    getSummaryReport
} from '../services/report.service.js';
import { AppError } from '../errors/app-error.js';

export async function getSummary(req, res, next) {
    try {
        const result = await getSummaryReport(req.user.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch summary', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function getMonthlySummary(req, res, next) {
    try {
        const month = req.validated?.query?.month || req.query.month;
        const result = await getMonthlySummaryReport(req.user.id, month);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch monthly summary', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function getCategories(req, res, next) {
    try {
        const result = await getExpenseCategoriesReport(req.user.id);

        if (!result.ok) {
            throw new AppError(result.message || 'Failed to fetch category report', result.status || 400);
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}
