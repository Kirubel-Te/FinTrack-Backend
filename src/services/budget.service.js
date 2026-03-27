import prisma from '../config/prisma.js';

function toNumber(value) {
    return Number(value ?? 0);
}

function getMonthlyRange(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { start, end };
}

function getPeriodRange(period) {
    if (period === 'monthly') {
        return getMonthlyRange();
    }

    return null;
}

function toBudgetPayload(payload) {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'amount')) {
        data.amount = Number(payload.amount);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'period')) {
        data.period = payload.period;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
        data.category = payload.category;
    }

    return data;
}

export async function createBudget(userId, payload) {
    const normalized = toBudgetPayload(payload);

    const existing = await prisma.budget.findFirst({
        where: {
            userId,
            period: normalized.period,
            category: normalized.category ?? null
        }
    });

    if (existing) {
        return {
            ok: false,
            status: 409,
            message: 'Budget already exists for this period and category'
        };
    }

    const created = await prisma.budget.create({
        data: {
            ...normalized,
            userId
        }
    });

    return {
        ok: true,
        status: 201,
        data: created
    };
}

export async function listBudgets(userId, filters = {}) {
    const where = {
        userId,
        ...(filters.period ? { period: filters.period } : {}),
        ...(Object.prototype.hasOwnProperty.call(filters, 'category') ? { category: filters.category } : {})
    };

    const budgets = await prisma.budget.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }]
    });

    return {
        ok: true,
        status: 200,
        data: budgets
    };
}

export async function updateBudget(userId, id, payload) {
    const existing = await prisma.budget.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return {
            ok: false,
            status: 404,
            message: 'Budget not found'
        };
    }

    const normalized = toBudgetPayload(payload);
    const nextPeriod = normalized.period ?? existing.period;
    const hasCategoryUpdate = Object.prototype.hasOwnProperty.call(normalized, 'category');
    const nextCategory = hasCategoryUpdate ? normalized.category : existing.category;

    if (nextPeriod !== existing.period || nextCategory !== existing.category) {
        const duplicate = await prisma.budget.findFirst({
            where: {
                userId,
                period: nextPeriod,
                category: nextCategory,
                id: { not: id }
            }
        });

        if (duplicate) {
            return {
                ok: false,
                status: 409,
                message: 'Budget already exists for this period and category'
            };
        }
    }

    const updated = await prisma.budget.update({
        where: { id: existing.id },
        data: normalized
    });

    return {
        ok: true,
        status: 200,
        data: updated
    };
}

export async function deleteBudget(userId, id) {
    const existing = await prisma.budget.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!existing) {
        return {
            ok: false,
            status: 404,
            message: 'Budget not found'
        };
    }

    await prisma.budget.delete({
        where: { id: existing.id }
    });

    return {
        ok: true,
        status: 200,
        data: { id: existing.id }
    };
}

export async function getBudgetSummary(userId, filters = {}) {
    const period = filters.period || 'monthly';
    const category = Object.prototype.hasOwnProperty.call(filters, 'category') ? filters.category : null;

    const budget = await prisma.budget.findFirst({
        where: {
            userId,
            period,
            category
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (!budget) {
        return {
            ok: false,
            status: 404,
            message: 'Budget not found'
        };
    }

    const range = getPeriodRange(period);

    if (!range) {
        return {
            ok: false,
            status: 400,
            message: 'Unsupported budget period'
        };
    }

    const where = {
        userId,
        date: {
            gte: range.start,
            lte: range.end
        },
        ...(category ? { category } : {})
    };

    const expenseAggregate = await prisma.expense.aggregate({
        where,
        _sum: { amount: true }
    });

    const budgetAmount = toNumber(budget.amount);
    const spent = toNumber(expenseAggregate._sum.amount);
    const remaining = budgetAmount - spent;
    const usage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    let status = 'within_budget';

    if (usage >= 100) {
        status = 'overspent';
    } else if (usage >= 80) {
        status = 'warning';
    }

    return {
        ok: true,
        status: 200,
        data: {
            budget: budgetAmount,
            spent,
            remaining,
            usage,
            status,
            period,
            category
        }
    };
}
