export function buildTransactionListQuery(userId, filters) {
    const { page, limit, startDate, endDate, category } = filters;

    const where = {
        userId,
        ...(category && { category })
    };

    if (startDate || endDate) {
        const dateFilter = {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
        };

        if (dateFilter.gte && Number.isNaN(dateFilter.gte.getTime())) {
            return { ok: false, status: 400, message: 'startDate must be valid' };
        }

        if (dateFilter.lte && Number.isNaN(dateFilter.lte.getTime())) {
            return { ok: false, status: 400, message: 'endDate must be valid' };
        }

        if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
            return {
                ok: false,
                status: 400,
                message: 'startDate cannot be greater than endDate'
            };
        }

        where.date = dateFilter;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    return {
        ok: true,
        query: {
            where,
            page,
            limit,
            skip,
            take
        }
    };
}

function normalizeSearchKeyword(keyword) {
    if (typeof keyword !== 'string') {
        return undefined;
    }

    const normalized = keyword.trim();
    return normalized || undefined;
}

export function buildTransactionSearchQuery(userId, filters) {
    const listQuery = buildTransactionListQuery(userId, filters);

    if (!listQuery.ok) {
        return listQuery;
    }

    const keyword = normalizeSearchKeyword(filters.keyword);
    const where = {
        ...listQuery.query.where
    };

    if (keyword) {
        where.OR = [
            {
                description: {
                    contains: keyword,
                    mode: 'insensitive'
                }
            },
            {
                category: {
                    contains: keyword,
                    mode: 'insensitive'
                }
            }
        ];
    }

    return {
        ok: true,
        query: {
            ...listQuery.query,
            where,
            keyword
        }
    };
}

export function buildPaginationMeta({ page, limit, total }) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    };
}
