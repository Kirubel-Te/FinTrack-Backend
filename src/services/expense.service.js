import prisma from '../config/prisma.js';
import {
    buildPaginationMeta,
    buildTransactionListQuery
} from './transaction-list-query.service.js';
import { normalizeExpenseCategory } from '../constants/expense-categories.js';

function normalizeExpensePayload(payload) {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'amount')) {
        data.amount = Number(payload.amount);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
        data.category = normalizeExpenseCategory(payload.category);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'date')) {
        data.date = payload.date instanceof Date ? payload.date : new Date(payload.date);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
        data.description = payload.description;
    }

    return data;
}

export async function listExpenses(userId, queryParams) {
    const listQuery = buildTransactionListQuery(userId, queryParams);

    if (!listQuery.ok) {
        return listQuery;
    }

    const { where, skip, take, page, limit } = listQuery.query;

    const [items, total] = await Promise.all([
        prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take
        }),
        prisma.expense.count({ where })
    ]);

    return {
        ok: true,
        status: 200,
        data: items,
        meta: buildPaginationMeta({ page, limit, total })
    };
}

export async function getExpenseById(userId, id) {
    const expense = await prisma.expense.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!expense) {
        return { ok: false, status: 404, message: 'Expense not found' };
    }

    return { ok: true, status: 200, data: expense };
}

export async function createExpense(userId, payload) {
    const normalizedPayload = normalizeExpensePayload(payload);

    const created = await prisma.expense.create({
        data: {
            ...normalizedPayload,
            userId
        }
    });

    return { ok: true, status: 201, data: created };
}

export async function updateExpense(userId, id, payload) {
    const normalizedPayload = normalizeExpensePayload(payload);

    const existing = await prisma.expense.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return { ok: false, status: 404, message: 'Expense not found' };
    }

    const updated = await prisma.expense.update({
        where: { id: existing.id },
        data: normalizedPayload
    });

    return { ok: true, status: 200, data: updated };
}

export async function deleteExpense(userId, id) {
    const existing = await prisma.expense.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return { ok: false, status: 404, message: 'Expense not found' };
    }

    await prisma.expense.delete({
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