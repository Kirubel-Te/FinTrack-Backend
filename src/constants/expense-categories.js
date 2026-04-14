export const EXPENSE_CATEGORIES = ['food', 'health', 'leisure', 'transport', 'housing'];

export function normalizeExpenseCategory(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const normalized = value.trim().toLowerCase();

    // Accept common typo and normalize to the canonical category.
    if (normalized === 'lesiure') {
        return 'leisure';
    }

    return normalized;
}