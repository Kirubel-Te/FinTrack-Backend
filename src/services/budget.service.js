import prisma from '../config/prisma.js';
import { EXPENSE_CATEGORIES, normalizeExpenseCategory } from '../constants/expense-categories.js';

function toNumber(value) {
    return Number(value ?? 0);
}

function getMonthlyRange(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { start, end };
}

function getMonthlyRangeFromParts(year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return { start, end };
}

function getMonthYear(filters = {}, now = new Date()) {
    return {
        month: filters.month || now.getUTCMonth() + 1,
        year: filters.year || now.getUTCFullYear()
    };
}

function getBudgetMonthDate(month, year) {
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
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
        data.category = normalizeExpenseCategory(payload.category);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'month') && payload.month !== undefined) {
        data.month = Number(payload.month);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'year') && payload.year !== undefined) {
        data.year = Number(payload.year);
    }

    return data;
}

function getPersistableBudgetData(payload) {
    const { month, year, ...persistable } = payload;
    return persistable;
}

function buildExpenseCategoryFilter(category) {
    if (!category) {
        return {};
    }

    return {
        category: {
            equals: category,
            mode: 'insensitive'
        }
    };
}

function toSummaryStatus(usage) {
    if (usage >= 100) {
        return 'overspent';
    }

    if (usage >= 80) {
        return 'warning';
    }

    return 'within_budget';
}

async function withBudgetUsage(userId, budget) {
    const budgetMonth = budget.createdAt.getUTCMonth() + 1;
    const budgetYear = budget.createdAt.getUTCFullYear();
    const range = getMonthlyRangeFromParts(budgetYear, budgetMonth);

    const expenseAggregate = await prisma.expense.aggregate({
        where: {
            userId,
            date: {
                gte: range.start,
                lte: range.end
            },
            ...buildExpenseCategoryFilter(budget.category)
        },
        _sum: { amount: true }
    });

    const amount = toNumber(budget.amount);
    const spent = toNumber(expenseAggregate._sum.amount);
    const remaining = amount - spent;
    const usage = amount > 0 ? (spent / amount) * 100 : 0;

    return {
        ...budget,
        month: budgetMonth,
        year: budgetYear,
        spent,
        remaining,
        usage,
        status: toSummaryStatus(usage)
    };
}

export async function createBudget(userId, payload) {
    const normalized = toBudgetPayload(payload);
    const persistable = getPersistableBudgetData(normalized);
    const { month, year } = getMonthYear(normalized);
    const monthRange = getMonthlyRangeFromParts(year, month);
    const monthDate = getBudgetMonthDate(month, year);
    const category = normalized.category;

    if (!EXPENSE_CATEGORIES.includes(category)) {
        return {
            ok: false,
            status: 400,
            message: 'Invalid budget category'
        };
    }

    const existing = await prisma.budget.findFirst({
        where: {
            userId,
            period: normalized.period,
            category,
            createdAt: {
                gte: monthRange.start,
                lte: monthRange.end
            }
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
            ...persistable,
            category,
            createdAt: monthDate,
            userId
        }
    });

    const data = await withBudgetUsage(userId, created);

    return {
        ok: true,
        status: 201,
        data
    };
}

export async function listBudgets(userId, filters = {}) {
    const { month, year } = getMonthYear(filters);
    const monthRange = getMonthlyRangeFromParts(year, month);
    const normalizedCategory = filters.category ? normalizeExpenseCategory(filters.category) : undefined;

    const where = {
        userId,
        ...(filters.period ? { period: filters.period } : {}),
        ...(normalizedCategory ? { category: normalizedCategory } : {}),
        createdAt: {
            gte: monthRange.start,
            lte: monthRange.end
        }
    };

    const budgets = await prisma.budget.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }]
    });

    const withUsage = await Promise.all(budgets.map((budget) => withBudgetUsage(userId, budget)));

    return {
        ok: true,
        status: 200,
        data: withUsage
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
    const persistable = getPersistableBudgetData(normalized);
    const nextPeriod = normalized.period ?? existing.period;
    const nextCategory = normalized.category ?? existing.category;
    const currentMonth = existing.createdAt.getUTCMonth() + 1;
    const currentYear = existing.createdAt.getUTCFullYear();
    const nextMonth = normalized.month ?? currentMonth;
    const nextYear = normalized.year ?? currentYear;
    const targetMonthRange = getMonthlyRangeFromParts(nextYear, nextMonth);
    const targetMonthDate = getBudgetMonthDate(nextMonth, nextYear);

    if (!EXPENSE_CATEGORIES.includes(nextCategory)) {
        return {
            ok: false,
            status: 400,
            message: 'Invalid budget category'
        };
    }

    if (
        nextPeriod !== existing.period ||
        nextCategory !== existing.category ||
        nextMonth !== currentMonth ||
        nextYear !== currentYear
    ) {
        const duplicate = await prisma.budget.findFirst({
            where: {
                userId,
                period: nextPeriod,
                category: nextCategory,
                createdAt: {
                    gte: targetMonthRange.start,
                    lte: targetMonthRange.end
                },
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
        data: {
            ...persistable,
            category: nextCategory,
            createdAt: targetMonthDate
        }
    });

    const data = await withBudgetUsage(userId, updated);

    return {
        ok: true,
        status: 200,
        data
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
    const { month, year } = getMonthYear(filters);
    const category = filters.category ? normalizeExpenseCategory(filters.category) : null;

    const range = getPeriodRange(period);

    if (!range) {
        return {
            ok: false,
            status: 400,
            message: 'Unsupported budget period'
        };
    }

    const monthRange = getMonthlyRangeFromParts(year, month);

    const budgetWhere = {
        userId,
        period,
        createdAt: {
            gte: monthRange.start,
            lte: monthRange.end
        },
        ...(category ? { category } : {})
    };

    const budgets = await prisma.budget.findMany({
        where: budgetWhere,
        orderBy: [{ category: 'asc' }]
    });

    if (category && budgets.length === 0) {
        return {
            ok: false,
            status: 404,
            message: 'Budget not found'
        };
    }

    const summaries = await Promise.all(
        budgets.map(async (budget) => {
            const expenseAggregate = await prisma.expense.aggregate({
                where: {
                    userId,
                    date: {
                        gte: monthRange.start,
                        lte: monthRange.end
                    },
                    ...buildExpenseCategoryFilter(budget.category)
                },
                _sum: { amount: true }
            });

            const budgetAmount = toNumber(budget.amount);
            const spent = toNumber(expenseAggregate._sum.amount);
            const remaining = budgetAmount - spent;
            const usage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

            return {
                id: budget.id,
                category: budget.category,
                budget: budgetAmount,
                spent,
                remaining,
                usage,
                status: toSummaryStatus(usage),
                period,
                month,
                year
            };
        })
    );

    if (category) {
        return {
            ok: true,
            status: 200,
            data: summaries[0]
        };
    }

    const totals = summaries.reduce(
        (acc, item) => ({
            budget: acc.budget + item.budget,
            spent: acc.spent + item.spent,
            remaining: acc.remaining + item.remaining
        }),
        { budget: 0, spent: 0, remaining: 0 }
    );

    const totalUsage = totals.budget > 0 ? (totals.spent / totals.budget) * 100 : 0;

    return {
        ok: true,
        status: 200,
        data: {
            month,
            year,
            period,
            categories: summaries,
            totals: {
                ...totals,
                usage: totalUsage,
                status: toSummaryStatus(totalUsage)
            }
        }
    };
}
