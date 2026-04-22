import { z } from 'zod';

const requiredString = (fieldName) =>
    z
        .string({
            required_error: `${fieldName} is required`
        })
        .trim()
        .min(1, `${fieldName} is required`);

export const registerSchema = z.object({
    body: z.object({
        firstName: requiredString('First name'),
        lastName: requiredString('Last name'),
        email: requiredString('Email').email('Email must be valid').toLowerCase(),
        password: requiredString('Password').min(6, 'Password must be at least 6 characters')
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: requiredString('Email').email('Email must be valid').toLowerCase(),
        password: requiredString('Password')
    })
});

export const refreshTokenBodySchema = z.object({
    body: z
        .object({
            refreshToken: z.string().trim().min(1, 'refreshToken cannot be empty').optional()
        })
        .default({})
});

export const updateProfileSchema = z.object({
    body: z
        .object({
            firstName: z.string().trim().min(1, 'First name is required').optional(),
            lastName: z.string().trim().min(1, 'Last name is required').optional(),
            email: z.string().trim().email('Email must be valid').toLowerCase().optional()
        })
        .refine(
            (value) =>
                value.firstName !== undefined || value.lastName !== undefined || value.email !== undefined,
            {
                message: 'At least one of firstName, lastName, or email is required',
                path: ['body']
            }
        )
});

export const updatePasswordSchema = z.object({
    body: z
        .object({
            currentPassword: requiredString('Current password'),
            newPassword: requiredString('New password').min(6, 'New password must be at least 6 characters')
        })
        .refine((value) => value.currentPassword !== value.newPassword, {
            message: 'New password must be different from current password',
            path: ['newPassword']
        })
});
