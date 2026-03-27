import prisma from '../config/prisma.js';
import {
    buildPaginationMeta,
    buildTransactionListQuery
} from './transaction-list-query.service.js';

function normalizeIncomePayload(payload) {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'amount')) {
        data.amount = Number(payload.amount);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
        data.category = payload.category.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'date')) {
        data.date = payload.date instanceof Date ? payload.date : new Date(payload.date);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
        data.description = payload.description;
    }

    return data;
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
    const normalizedPayload = normalizeIncomePayload(payload);

    const created = await prisma.income.create({
        data: {
            ...normalizedPayload,
            userId
        }
    });

    return { ok: true, status: 201, data: created };
}

export async function updateIncome(userId, id, payload) {
    const normalizedPayload = normalizeIncomePayload(payload);

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
        data: normalizedPayload
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