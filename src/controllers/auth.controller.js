import {
    getUserPublicById,
    loginUser,
    logoutUser,
    refreshAuthToken,
    registerUser
} from '../services/auth.service.js';

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

export async function register(req, res) {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'First name, last name, email, and password are required' });
        }

        if (
            typeof firstName !== 'string' ||
            typeof lastName !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({ message: 'First name, last name, email, and password must be strings' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const result = await registerUser({ firstName, lastName, email, password });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('register error:', error);
        return res.status(500).json({ message: 'Failed to register user' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Email and password must be strings' });
        }

        const result = await loginUser({ email, password });

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(result.status).json(result.data);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to login user' });
    }
}

export async function me(req, res) {
    try {
        const result = await getUserPublicById(req.user.userId);

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch current user' });
    }
}

export async function refresh(req, res) {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await refreshAuthToken(refreshToken);

        if (!result.ok) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        return res.status(result.status).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
        });
    }
}

export async function logout(req, res) {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await logoutUser(refreshToken);

        if (!result.ok) {
            return res.status(result.status).json({
                success: false,
                message: result.message
            });
        }

        return res.status(result.status).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to logout user'
        });
    }
}

