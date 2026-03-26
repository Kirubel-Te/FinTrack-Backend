import prisma from '../config/prisma.js';
import {
    buildPaginationMeta,
    buildTransactionListQuery
} from './transaction-list-query.service.js';

function parseAndValidateDate(dateValue) {
    if (!dateValue) {
        return { ok: false, message: 'Date is required' };
    }

    const parsed = new Date(dateValue);

    if (Number.isNaN(parsed.getTime())) {
        return { ok: false, message: 'Date must be valid' };
    }

    return { ok: true, value: parsed };
}

function validateCreateOrUpdatePayload(payload, { partial = false } = {}) {
    const hasAmount = Object.prototype.hasOwnProperty.call(payload, 'amount');
    const hasCategory = Object.prototype.hasOwnProperty.call(payload, 'category');
    const hasDate = Object.prototype.hasOwnProperty.call(payload, 'date');
    const hasDescription = Object.prototype.hasOwnProperty.call(payload, 'description');

    if (!partial && (!hasAmount || !hasCategory || !hasDate)) {
        return {
            ok: false,
            status: 400,
            message: 'Amount, category, and date are required'
        };
    }

    const data = {};

    if (hasAmount) {
        const numericAmount = Number(payload.amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return { ok: false, status: 400, message: 'Amount must be a positive number' };
        }
        data.amount = numericAmount;
    }

    if (hasCategory) {
        if (typeof payload.category !== 'string' || !payload.category.trim()) {
            return { ok: false, status: 400, message: 'Category must be non-empty' };
        }
        data.category = payload.category.trim();
    }

    if (hasDate) {
        const parsedDate = parseAndValidateDate(payload.date);
        if (!parsedDate.ok) {
            return { ok: false, status: 400, message: parsedDate.message };
        }
        data.date = parsedDate.value;
    }

    if (hasDescription) {
        if (payload.description === null || payload.description === undefined || payload.description === '') {
            data.description = null;
        } else if (typeof payload.description !== 'string') {
            return { ok: false, status: 400, message: 'Description must be a string when provided' };
        } else {
            data.description = payload.description.trim() || null;
        }
    }

    if (partial && Object.keys(data).length === 0) {
        return { ok: false, status: 400, message: 'At least one field is required to update' };
    }

    return { ok: true, data };
}

export async function listIncomes(userId, queryParams) {
    const listQuery = buildTransactionListQuery(userId, queryParams);

    if (!listQuery.ok) {
        return listQuery;
    }

    const { where, skip, take, page, limit } = listQuery.query;

    const [items, total] = await Promise.all([
        prisma.income.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take
        }),
        prisma.income.count({ where })
    ]);

    return {
        ok: true,
        status: 200,
        data: items,
        meta: buildPaginationMeta({ page, limit, total })
    };
}

export async function getIncomeById(userId, id) {
    const income = await prisma.income.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!income) {
        return { ok: false, status: 404, message: 'Income not found' };
    }

    return { ok: true, status: 200, data: income };
}

export async function createIncome(userId, payload) {
    const validation = validateCreateOrUpdatePayload(payload);
    if (!validation.ok) {
        return validation;
    }

    const created = await prisma.income.create({
        data: {
            ...validation.data,
            userId
        }
    });

    return { ok: true, status: 201, data: created };
}

export async function updateIncome(userId, id, payload) {
    const validation = validateCreateOrUpdatePayload(payload, { partial: true });
    if (!validation.ok) {
        return validation;
    }

    const existing = await prisma.income.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return { ok: false, status: 404, message: 'Income not found' };
    }

    const updated = await prisma.income.update({
        where: { id: existing.id },
        data: validation.data
    });

    return { ok: true, status: 200, data: updated };
}

export async function deleteIncome(userId, id) {
    const existing = await prisma.income.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return { ok: false, status: 404, message: 'Income not found' };
    }

    await prisma.income.delete({
        where: { id: existing.id }
    });

    return {
        ok: true,
        status: 200,
        data: {
            id: existing.id
        }
    };
}