import { getUserPublicById, loginUser, registerUser } from '../services/auth.service.js';

export async function register(req, res) {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'First name, last name, email, and password are required' });
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
        return res.status(500).json({ message: 'Failed to register user' });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
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

