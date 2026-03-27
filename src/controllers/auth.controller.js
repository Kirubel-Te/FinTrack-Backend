import {
    getUserPublicById,
    loginUser,
    logoutUser,
    refreshAuthToken,
    registerUser
} from '../services/auth.service.js';
import { AppError } from '../errors/app-error.js';

function getRefreshTokenFromRequest(req) {
    const bodyToken = req.body?.refreshToken;

    if (bodyToken && typeof bodyToken === 'string') {
        return bodyToken;
    }

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return null;
}

export async function register(req, res, next) {
    try {
        const { firstName, lastName, email, password } = req.body;

        const result = await registerUser({ firstName, lastName, email, password });

        if (!result.ok) {
            throw new AppError(result.message, result.status);
        }

        return res.status(result.status).json(result.data);
    } catch (error) {
        return next(error);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const result = await loginUser({ email, password });

        if (!result.ok) {
            throw new AppError(result.message, result.status);
        }

        return res.status(result.status).json(result.data);
    } catch (error) {
        return next(error);
    }
}

export async function me(req, res, next) {
    try {
        const result = await getUserPublicById(req.user.id);

        if (!result.ok) {
            throw new AppError(result.message, result.status);
        }

        return res.status(200).json(result.data);
    } catch (error) {
        return next(error);
    }
}

export async function refresh(req, res, next) {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await refreshAuthToken(refreshToken);

        if (!result.ok) {
            throw new AppError(result.message, result.status);
        }

        return res.status(result.status).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

export async function logout(req, res, next) {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await logoutUser(refreshToken);

        if (!result.ok) {
            throw new AppError(result.message, result.status);
        }

        return res.status(result.status).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return next(error);
    }
}

