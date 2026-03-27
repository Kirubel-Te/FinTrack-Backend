import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../errors/app-error.js';

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Authorization token is required', 401));
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
        return next(new AppError('Invalid or expired token', 401));
    }

    req.user = {
        ...payload,
        id: payload.userId
    };

    return next();
}
