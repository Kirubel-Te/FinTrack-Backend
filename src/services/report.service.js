import prisma from '../config/prisma.js';

function toNumber(value) {
    return Number(value ?? 0);
}

function getMonthDateRange(month) {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
        return {
            ok: false,
            status: 400,
            message: 'month must be in YYYY-MM format'
        };
    }

    const [yearPart, monthPart] = month.split('-');
    const year = Number.parseInt(yearPart, 10);
    const monthIndex = Number.parseInt(monthPart, 10) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return {
            ok: false,
            status: 400,
            message: 'month must be in YYYY-MM format'
        };
    }

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    return {
        ok: true,
        range: {
            startOfMonth,
            endOfMonth
        }
    };
}

async function aggregateTotals(userId, dateFilter) {
    const baseWhere = {
        userId,
        ...(dateFilter && { date: dateFilter })
    };

    const [incomeAggregate, expenseAggregate] = await Promise.all([
        prisma.income.aggregate({
            where: baseWhere,
            _sum: { amount: true }
        }),
        prisma.expense.aggregate({
            where: baseWhere,
            _sum: { amount: true }
        })
    ]);

    const totalIncome = toNumber(incomeAggregate._sum.amount);
    const totalExpense = toNumber(expenseAggregate._sum.amount);

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
    };
}

export async function getSummaryReport(userId) {
    const totals = await aggregateTotals(userId);

    return {
        ok: true,
        status: 200,
        data: totals
    };
}

export async function getMonthlySummaryReport(userId, month) {
    const parsedMonth = getMonthDateRange(month);

    if (!parsedMonth.ok) {
        return parsedMonth;
    }

    const totals = await aggregateTotals(userId, {
        gte: parsedMonth.range.startOfMonth,
        lte: parsedMonth.range.endOfMonth
    });

    return {
        ok: true,
        status: 200,
        data: {
            month,
            ...totals
        }
    };
}

export async function getExpenseCategoriesReport(userId) {
    const grouped = await prisma.expense.groupBy({
        by: ['category'],
        where: { userId },
        _sum: { amount: true }
    });

    return {
        ok: true,
        status: 200,
        data: grouped.map((item) => ({
            category: item.category,
            total: toNumber(item._sum.amount)
        }))
    };
}
