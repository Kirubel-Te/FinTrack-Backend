import {
    deleteUserAccount,
    getUserPublicById,
    loginUser,
    logoutUser,
    refreshAuthToken,
    registerUser,
    updateUserPassword,
    updateUserProfile
} from '../services/auth.service.js';
import { AppError } from '../errors/app-error.js';

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
        const result = await refreshAuthToken();

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
        const result = await logoutUser();

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

export async function deleteAccount(req, res, next) {
    try {
        const result = await deleteUserAccount(req.user.id);

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

export async function updateProfile(req, res, next) {
    try {
        const { firstName, lastName, email } = req.body;
        const result = await updateUserProfile(req.user.id, { firstName, lastName, email });

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

export async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await updateUserPassword(req.user.id, { currentPassword, newPassword });

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

