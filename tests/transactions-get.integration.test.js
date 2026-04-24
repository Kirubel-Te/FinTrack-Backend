import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

const db = {
    users: [],
    incomes: [],
    expenses: [],
    refreshTokens: []
};

let idCounter = 1;

function nextId(prefix) {
    const value = `${prefix}-${idCounter}`;
    idCounter += 1;
    return value;
}

function selectFields(record, select) {
    if (!select) {
        return { ...record };
    }

    return Object.keys(select).reduce((acc, key) => {
        if (select[key]) {
            acc[key] = record[key];
        }

        return acc;
    }, {});
}

function applyWhere(items, where = {}) {
    return items.filter((item) => {
        if (where.userId && item.userId !== where.userId) {
            return false;
        }

        if (where.category) {
            if (typeof where.category === 'string') {
                if (item.category !== where.category) {
                    return false;
                }
            } else if (where.category.contains) {
                const itemCategory = String(item.category ?? '').toLowerCase();
                const searchValue = String(where.category.contains ?? '').toLowerCase();

                if (!itemCategory.includes(searchValue)) {
                    return false;
                }
            }
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

        if (where.description && where.description.contains) {
            const itemDescription = String(item.description ?? '').toLowerCase();
            const searchValue = String(where.description.contains ?? '').toLowerCase();

            if (!itemDescription.includes(searchValue)) {
                return false;
            }
        }

        if (Array.isArray(where.OR) && where.OR.length > 0) {
            const matchesAny = where.OR.some((branch) => applyWhere([item], branch).length > 0);

            if (!matchesAny) {
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
        count: vi.fn(async ({ where }) => applyWhere(db.incomes, where).length),
        aggregate: vi.fn(async ({ where }) => {
            const total = applyWhere(db.incomes, where).reduce((sum, item) => sum + Number(item.amount), 0);
            return {
                _sum: {
                    amount: total
                }
            };
        })
    },
    expense: {
        findMany: vi.fn(async (args) => listItems(db.expenses, args)),
        count: vi.fn(async ({ where }) => applyWhere(db.expenses, where).length),
        aggregate: vi.fn(async ({ where }) => {
            const total = applyWhere(db.expenses, where).reduce((sum, item) => sum + Number(item.amount), 0);
            return {
                _sum: {
                    amount: total
                }
            };
        }),
        groupBy: vi.fn(async ({ where }) => {
            const grouped = new Map();

            for (const item of applyWhere(db.expenses, where)) {
                const current = grouped.get(item.category) ?? 0;
                grouped.set(item.category, current + Number(item.amount));
            }

            return Array.from(grouped.entries()).map(([category, total]) => ({
                category,
                _sum: { amount: total }
            }));
        })
    },
    user: {
        findUnique: vi.fn(async ({ where, select }) => {
            let found = null;

            if (where.email) {
                found = db.users.find((item) => item.email === where.email) || null;
            } else if (where.id) {
                found = db.users.find((item) => item.id === where.id) || null;
            }

            return found ? selectFields(found, select) : null;
        }),
        create: vi.fn(async ({ data, select }) => {
            const created = {
                id: nextId('user'),
                createdAt: new Date(),
                ...data
            };

            db.users.push(created);

            return selectFields(created, select);
        })
    },
    refreshToken: {
        create: vi.fn(async ({ data }) => {
            const created = {
                id: nextId('rt'),
                createdAt: new Date(),
                revokedAt: null,
                ...data
            };

            db.refreshTokens.push(created);
            return created;
        }),
        findUnique: vi.fn(async ({ where }) => {
            if (!where.tokenHash) {
                return null;
            }

            return db.refreshTokens.find((item) => item.tokenHash === where.tokenHash) || null;
        }),
        update: vi.fn(async ({ where, data }) => {
            const currentIndex = db.refreshTokens.findIndex((item) => item.id === where.id);

            if (currentIndex < 0) {
                throw new Error('Refresh token not found');
            }

            db.refreshTokens[currentIndex] = {
                ...db.refreshTokens[currentIndex],
                ...data
            };

            return db.refreshTokens[currentIndex];
        }),
        updateMany: vi.fn(async ({ where, data }) => {
            let count = 0;

            db.refreshTokens = db.refreshTokens.map((item) => {
                const tokenMatches = where.tokenHash ? item.tokenHash === where.tokenHash : true;
                const revokedMatches =
                    Object.prototype.hasOwnProperty.call(where, 'revokedAt')
                        ? item.revokedAt === where.revokedAt
                        : true;

                if (tokenMatches && revokedMatches) {
                    count += 1;
                    return {
                        ...item,
                        ...data
                    };
                }

                return item;
            });

            return { count };
        })
    }
};

vi.mock('../src/config/prisma.js', () => ({
    default: prismaMock
}));

const tokenFactory = {
    accessSequence: 1,
    refreshSequence: 1
};

const generateAccessTokenMock = vi.fn(({ userId }) => {
    const token = `access-${userId}-${tokenFactory.accessSequence}`;
    tokenFactory.accessSequence += 1;
    return token;
});

const generateRefreshTokenMock = vi.fn(({ userId }) => {
    const token = `refresh-${userId}-${tokenFactory.refreshSequence}`;
    tokenFactory.refreshSequence += 1;
    return token;
});

function extractUserIdFromToken(token, prefix) {
    if (typeof token !== 'string' || !token.startsWith(prefix)) {
        return null;
    }

    const withoutPrefix = token.slice(prefix.length);
    const lastDashIndex = withoutPrefix.lastIndexOf('-');

    if (lastDashIndex < 1) {
        return null;
    }

    return withoutPrefix.slice(0, lastDashIndex);
}

const verifyAccessTokenMock = vi.fn((token) => {
    if (token === 'valid-token') {
        return { userId: 'user-1' };
    }

    const userId = extractUserIdFromToken(token, 'access-');

    if (userId) {
        return { userId };
    }

    return null;
});

const verifyRefreshTokenMock = vi.fn((token) => {
    const userId = extractUserIdFromToken(token, 'refresh-');

    if (userId) {
        return { userId };
    }

    return null;
});

vi.mock('../src/utils/jwt.js', () => ({
    generateAccessToken: generateAccessTokenMock,
    generateRefreshToken: generateRefreshTokenMock,
    verifyAccessToken: verifyAccessTokenMock,
    verifyRefreshToken: verifyRefreshTokenMock,
    generateToken: generateAccessTokenMock,
    verifyToken: verifyAccessTokenMock
}));

const { default: app } = await import('../src/app.js');

function auth(requestBuilder) {
    return requestBuilder.set('Authorization', 'Bearer valid-token');
}

describe('GET /api/v1/incomes', () => {
    beforeEach(() => {
        db.users = [];
        db.incomes = [];
        db.expenses = [];
        db.refreshTokens = [];
        tokenFactory.accessSequence = 1;
        tokenFactory.refreshSequence = 1;
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
        db.users = [];
        db.incomes = [];
        db.expenses = [];
        db.refreshTokens = [];
        tokenFactory.accessSequence = 1;
        tokenFactory.refreshSequence = 1;
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

describe('GET /api/v1/reports', () => {
    beforeEach(() => {
        db.users = [];
        db.incomes = [];
        db.expenses = [];
        db.refreshTokens = [];
        tokenFactory.accessSequence = 1;
        tokenFactory.refreshSequence = 1;
        vi.clearAllMocks();
    });

    it('returns financial summary for authenticated user', async () => {
        db.incomes = [
            { id: 'in-1', userId: 'user-1', category: 'salary', amount: 3000, date: '2026-01-01T00:00:00.000Z' },
            { id: 'in-2', userId: 'user-1', category: 'bonus', amount: 500, date: '2026-01-10T00:00:00.000Z' },
            { id: 'in-3', userId: 'user-2', category: 'salary', amount: 1000, date: '2026-01-10T00:00:00.000Z' }
        ];

        db.expenses = [
            { id: 'ex-1', userId: 'user-1', category: 'rent', amount: 1200, date: '2026-01-05T00:00:00.000Z' },
            { id: 'ex-2', userId: 'user-1', category: 'food', amount: 300, date: '2026-01-07T00:00:00.000Z' },
            { id: 'ex-3', userId: 'user-2', category: 'food', amount: 900, date: '2026-01-07T00:00:00.000Z' }
        ];

        const response = await auth(request(app).get('/api/v1/reports/summary'));

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: {
                totalIncome: 3500,
                totalExpense: 1500,
                balance: 2000
            }
        });

        expect(prismaMock.income.aggregate).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            _sum: { amount: true }
        });

        expect(prismaMock.expense.aggregate).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            _sum: { amount: true }
        });
    });

    it('returns monthly summary for provided month', async () => {
        db.incomes = [
            { id: 'in-1', userId: 'user-1', category: 'salary', amount: 2500, date: '2026-01-03T00:00:00.000Z' },
            { id: 'in-2', userId: 'user-1', category: 'bonus', amount: 200, date: '2026-02-03T00:00:00.000Z' }
        ];

        db.expenses = [
            { id: 'ex-1', userId: 'user-1', category: 'rent', amount: 1000, date: '2026-01-12T00:00:00.000Z' },
            { id: 'ex-2', userId: 'user-1', category: 'food', amount: 300, date: '2026-02-12T00:00:00.000Z' }
        ];

        const response = await auth(
            request(app).get('/api/v1/reports/monthly').query({ month: '2026-01' })
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: {
                month: '2026-01',
                totalIncome: 2500,
                totalExpense: 1000,
                balance: 1500
            }
        });

        const incomeWhere = prismaMock.income.aggregate.mock.calls[0][0].where;
        expect(incomeWhere.userId).toBe('user-1');
        expect(incomeWhere.date.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
        expect(incomeWhere.date.lte.toISOString()).toBe('2026-01-31T23:59:59.999Z');
    });

    it('returns 400 for invalid monthly query format', async () => {
        const response = await auth(
            request(app).get('/api/v1/reports/monthly').query({ month: '2026/01' })
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('month must be in YYYY-MM format');
    });

    it('returns category aggregation for expenses', async () => {
        db.expenses = [
            { id: 'ex-1', userId: 'user-1', category: 'food', amount: 150, date: '2026-01-01T00:00:00.000Z' },
            { id: 'ex-2', userId: 'user-1', category: 'food', amount: 50, date: '2026-01-03T00:00:00.000Z' },
            { id: 'ex-3', userId: 'user-1', category: 'rent', amount: 900, date: '2026-01-02T00:00:00.000Z' },
            { id: 'ex-4', userId: 'user-2', category: 'food', amount: 1000, date: '2026-01-03T00:00:00.000Z' }
        ];

        const response = await auth(request(app).get('/api/v1/reports/categories'));

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: [
                { category: 'food', total: 200 },
                { category: 'rent', total: 900 }
            ]
        });

        expect(prismaMock.expense.groupBy).toHaveBeenCalledWith({
            by: ['category'],
            where: { userId: 'user-1' },
            _sum: { amount: true }
        });
    });

    it('searches transactions and returns analytics', async () => {
        db.incomes = [
            {
                id: 'in-1',
                userId: 'user-1',
                category: 'salary',
                amount: 3000,
                description: 'Monthly salary',
                date: '2026-01-01T00:00:00.000Z'
            },
            {
                id: 'in-2',
                userId: 'user-1',
                category: 'bonus',
                amount: 500,
                description: 'Rent reimbursement',
                date: '2026-01-10T00:00:00.000Z'
            },
            {
                id: 'in-other',
                userId: 'user-2',
                category: 'bonus',
                amount: 800,
                description: 'Rent reimbursement',
                date: '2026-01-11T00:00:00.000Z'
            }
        ];

        db.expenses = [
            {
                id: 'ex-1',
                userId: 'user-1',
                category: 'rent',
                amount: 1200,
                description: 'Apartment rent',
                date: '2026-01-05T00:00:00.000Z'
            },
            {
                id: 'ex-2',
                userId: 'user-1',
                category: 'food',
                amount: 300,
                description: 'Groceries',
                date: '2026-01-07T00:00:00.000Z'
            }
        ];

        const response = await auth(
            request(app)
                .get('/api/v1/reports/transactions/search')
                .query({ keyword: 'rent', page: 1, limit: 10 })
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: {
                records: [
                    expect.objectContaining({
                        id: 'in-2',
                        transactionType: 'income',
                        category: 'bonus',
                        amount: 500
                    }),
                    expect.objectContaining({
                        id: 'ex-1',
                        transactionType: 'expense',
                        category: 'rent',
                        amount: 1200
                    })
                ],
                analytics: {
                    totalCount: 2,
                    totalAmount: 1700,
                    categoryBreakdown: [
                        { category: 'rent', totalCount: 1, totalAmount: 1200 },
                        { category: 'bonus', totalCount: 1, totalAmount: 500 }
                    ],
                    dateRange: {
                        startDate: '2026-01-05T00:00:00.000Z',
                        endDate: '2026-01-10T00:00:00.000Z'
                    }
                }
            },
            meta: {
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1
            }
        });

        expect(response.body.data.records.map((record) => record.id)).toEqual(['in-2', 'ex-1']);
    });
});

describe('POST /api/v1/auth refresh flow', () => {
    beforeEach(() => {
        db.users = [];
        db.incomes = [];
        db.expenses = [];
        db.refreshTokens = [];
        tokenFactory.accessSequence = 1;
        tokenFactory.refreshSequence = 1;
        vi.clearAllMocks();
    });

    it('returns access and refresh tokens on register and login', async () => {
        const registerResponse = await request(app).post('/api/v1/auth/register').send({
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            password: 'secret123'
        });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body.accessToken).toBeTruthy();
        expect(registerResponse.body.refreshToken).toBeTruthy();

        const loginResponse = await request(app).post('/api/v1/auth/login').send({
            email: 'ada@example.com',
            password: 'secret123'
        });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.accessToken).toBeTruthy();
        expect(loginResponse.body.refreshToken).toBeTruthy();
    });

    it('refreshes token and rotates refresh token when current one is valid', async () => {
        const currentRefreshToken = 'refresh-user-1-1';
        const tokenHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');

        db.refreshTokens.push({
            id: 'rt-1',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
            revokedAt: null,
            createdAt: new Date()
        });

        const response = await request(app).post('/api/v1/auth/refresh').send({
            refreshToken: currentRefreshToken
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeTruthy();
        expect(response.body.data.refreshToken).toBeTruthy();

        const originalToken = db.refreshTokens.find((item) => item.id === 'rt-1');
        expect(originalToken.revokedAt).toBeTruthy();
        expect(db.refreshTokens.length).toBe(2);
    });

    it('returns 401 for invalid refresh token', async () => {
        const response = await request(app).post('/api/v1/auth/refresh').send({
            refreshToken: 'invalid-refresh-token'
        });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('invalidates refresh token on logout', async () => {
        const tokenToRevoke = 'refresh-user-1-5';
        const tokenHash = crypto.createHash('sha256').update(tokenToRevoke).digest('hex');

        db.refreshTokens.push({
            id: 'rt-logout',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
            revokedAt: null,
            createdAt: new Date()
        });

        const response = await request(app).post('/api/v1/auth/logout').send({
            refreshToken: tokenToRevoke
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const revokedToken = db.refreshTokens.find((item) => item.id === 'rt-logout');
        expect(revokedToken.revokedAt).toBeTruthy();
    });
});
