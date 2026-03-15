export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

import jwt from 'jsonwebtoken';

export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null; // Invalid token
    }
}

