import { z } from 'zod';

export const monthlyReportSchema = z.object({
    query: z.object({
        month: z
            .string({
                required_error: 'month is required'
            })
            .trim()
            .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
    })
});
