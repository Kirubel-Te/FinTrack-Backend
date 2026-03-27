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
