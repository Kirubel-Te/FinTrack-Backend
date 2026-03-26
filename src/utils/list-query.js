const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function getSingleQueryValue(value, fieldName) {
    if (Array.isArray(value)) {
        return {
            ok: false,
            status: 400,
            message: `${fieldName} must be provided only once`
        };
    }

    return { ok: true, value };
}

function parseIntegerQuery(value, fieldName, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return { ok: true, value: defaultValue };
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return {
            ok: false,
            status: 400,
            message: `${fieldName} must be a positive integer`
        };
    }

    return { ok: true, value: parsed };
}

export function parseTransactionListQueryParams(queryParams = {}) {
    const pageValue = getSingleQueryValue(queryParams.page, 'page');
    if (!pageValue.ok) {
        return pageValue;
    }

    const limitValue = getSingleQueryValue(queryParams.limit, 'limit');
    if (!limitValue.ok) {
        return limitValue;
    }

    const startDateValue = getSingleQueryValue(queryParams.startDate, 'startDate');
    if (!startDateValue.ok) {
        return startDateValue;
    }

    const endDateValue = getSingleQueryValue(queryParams.endDate, 'endDate');
    if (!endDateValue.ok) {
        return endDateValue;
    }

    const categoryValue = getSingleQueryValue(queryParams.category, 'category');
    if (!categoryValue.ok) {
        return categoryValue;
    }

    const parsedPage = parseIntegerQuery(pageValue.value, 'page', DEFAULT_PAGE);
    if (!parsedPage.ok) {
        return parsedPage;
    }

    const parsedLimit = parseIntegerQuery(limitValue.value, 'limit', DEFAULT_LIMIT);
    if (!parsedLimit.ok) {
        return parsedLimit;
    }

    const normalizedLimit = Math.min(parsedLimit.value, MAX_LIMIT);
    const normalizedCategory =
        typeof categoryValue.value === 'string' && categoryValue.value.trim()
            ? categoryValue.value.trim()
            : undefined;

    const normalizedStartDate =
        typeof startDateValue.value === 'string' && startDateValue.value.trim()
            ? startDateValue.value.trim()
            : undefined;

    const normalizedEndDate =
        typeof endDateValue.value === 'string' && endDateValue.value.trim()
            ? endDateValue.value.trim()
            : undefined;

    return {
        ok: true,
        data: {
            page: parsedPage.value,
            limit: normalizedLimit,
            category: normalizedCategory,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate
        }
    };
}
