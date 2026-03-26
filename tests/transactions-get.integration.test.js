import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
    incomes: [],
    expenses: []
};

function applyWhere(items, where = {}) {
    return items.filter((item) => {
        if (where.userId && item.userId !== where.userId) {
            return false;
        }

        if (where.category && item.category !== where.category) {
            return false;
        }

        if (where.date) {
            const itemDate = new Date(item.date);

            if (where.date.gte && itemDate < where.date.gte) {
                return false;
            }

            if (where.date.lte && itemDate > where.date.lte) {
                return false;
            }
        }

        return true;
    });
}

function listItems(items, { where, orderBy, skip = 0, take = items.length }) {
    const filtered = applyWhere(items, where);

    if (orderBy?.date === 'desc') {
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return filtered.slice(skip, skip + take);
}

const prismaMock = {
    income: {
        findMany: vi.fn(async (args) => listItems(db.incomes, args)),
        count: vi.fn(async ({ where }) => applyWhere(db.incomes, where).length)
    },
    expense: {
        findMany: vi.fn(async (args) => listItems(db.expenses, args)),
        count: vi.fn(async ({ where }) => applyWhere(db.expenses, where).length)
    },
    user: {
        findUnique: vi.fn(),
        create: vi.fn()
    }
};

vi.mock('../src/config/prisma.js', () => ({
    default: prismaMock
}));

const verifyTokenMock = vi.fn((token) => {
    if (token === 'valid-token') {
        return { userId: 'user-1' };
    }

    return null;
});

vi.mock('../src/utils/jwt.js', () => ({
    verifyToken: verifyTokenMock,
    generateToken: vi.fn(() => 'mock-token')
}));

const { default: app } = await import('../src/app.js');

function auth(requestBuilder) {
    return requestBuilder.set('Authorization', 'Bearer valid-token');
}

describe('GET /api/v1/incomes', () => {
    beforeEach(() => {
        db.incomes = [];
        db.expenses = [];
        vi.clearAllMocks();
    });

    it('returns paginated results with metadata and enforces ownership', async () => {
        db.incomes = Array.from({ length: 12 }).map((_, index) => ({
            id: `income-${index + 1}`,
            userId: 'user-1',
            category: index % 2 === 0 ? 'salary' : 'freelance',
            amount: 100 + index,
            date: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`).toISOString()
        }));

        db.incomes.push({
            id: 'income-other-user',
            userId: 'user-2',
            category: 'salary',
            amount: 999,
            date: new Date('2026-01-20T00:00:00.000Z').toISOString()
        });

        const response = await auth(request(app).get('/api/v1/incomes'));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(10);
        expect(response.body.meta).toEqual({
            page: 1,
            limit: 10,
            total: 12,
            totalPages: 2
        });

        expect(prismaMock.income.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-1' }),
                skip: 0,
                take: 10,
                orderBy: { date: 'desc' }
            })
        );

        const returnedIds = response.body.data.map((item) => item.id);
        expect(returnedIds).not.toContain('income-other-user');
    });

    it('applies category and date range filters', async () => {
        db.incomes = [
            {
                id: 'in-1',
                userId: 'user-1',
                category: 'food',
                amount: 20,
                date: '2026-01-03T10:00:00.000Z'
            },
            {
                id: 'in-2',
                userId: 'user-1',
                category: 'food',
                amount: 30,
                date: '2026-01-15T10:00:00.000Z'
            },
            {
                id: 'in-3',
                userId: 'user-1',
                category: 'food',
                amount: 40,
                date: '2026-02-01T10:00:00.000Z'
            },
            {
                id: 'in-4',
                userId: 'user-1',
                category: 'salary',
                amount: 50,
                date: '2026-01-10T10:00:00.000Z'
            }
        ];

        const response = await auth(
            request(app)
                .get('/api/v1/incomes')
                .query({
                    page: 1,
                    limit: 10,
                    startDate: '2026-01-01',
                    endDate: '2026-01-31',
                    category: 'food'
                })
        );

        expect(response.status).toBe(200);
        expect(response.body.data.map((item) => item.id)).toEqual(['in-2', 'in-1']);
        expect(response.body.meta).toEqual({
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
        });
    });

    it('returns 400 for invalid page value', async () => {
        const response = await auth(request(app).get('/api/v1/incomes').query({ page: 'abc' }));

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('page must be a positive integer');
    });

    it('returns 400 when startDate is greater than endDate', async () => {
        const response = await auth(
            request(app)
                .get('/api/v1/incomes')
                .query({ startDate: '2026-02-01', endDate: '2026-01-01' })
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('startDate cannot be greater than endDate');
    });
});

describe('GET /api/v1/expenses', () => {
    beforeEach(() => {
        db.incomes = [];
        db.expenses = [];
        vi.clearAllMocks();
    });

    it('returns paginated metadata with filters', async () => {
        db.expenses = [
            {
                id: 'ex-1',
                userId: 'user-1',
                category: 'food',
                amount: 10,
                date: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'ex-2',
                userId: 'user-1',
                category: 'food',
                amount: 15,
                date: '2026-01-02T00:00:00.000Z'
            },
            {
                id: 'ex-3',
                userId: 'user-1',
                category: 'rent',
                amount: 30,
                date: '2026-01-03T00:00:00.000Z'
            },
            {
                id: 'ex-other',
                userId: 'user-2',
                category: 'food',
                amount: 99,
                date: '2026-01-04T00:00:00.000Z'
            }
        ];

        const response = await auth(
            request(app)
                .get('/api/v1/expenses')
                .query({ page: 1, limit: 1, category: 'food' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe('ex-2');
        expect(response.body.meta).toEqual({
            page: 1,
            limit: 1,
            total: 2,
            totalPages: 2
        });

        expect(prismaMock.expense.count).toHaveBeenCalledWith({
            where: expect.objectContaining({ userId: 'user-1', category: 'food' })
        });
    });

    it('returns 400 for invalid endDate', async () => {
        const response = await auth(
            request(app).get('/api/v1/expenses').query({ endDate: 'not-a-date' })
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('endDate must be valid');
    });
});
