import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken
} from '../utils/jwt.js';

const REFRESH_TOKEN_TTL_DAYS = Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

function hashRefreshToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function calculateRefreshExpiryDate() {
	const now = new Date();
	now.setDate(now.getDate() + (Number.isNaN(REFRESH_TOKEN_TTL_DAYS) ? 7 : REFRESH_TOKEN_TTL_DAYS));
	return now;
}

function toPublicUser(user) {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		createdAt: user.createdAt
	};
}

async function issueTokenPair(userId) {
	const accessToken = generateAccessToken({ userId });
	const refreshToken = generateRefreshToken({ userId });

	await prisma.refreshToken.create({
		data: {
			tokenHash: hashRefreshToken(refreshToken),
			userId,
			expiresAt: calculateRefreshExpiryDate()
		}
	});

	return {
		accessToken,
		refreshToken
	};
}

export async function registerUser({ firstName, lastName, email, password }) {
	const normalizedFirstName = firstName.trim();
	const normalizedLastName = lastName.trim();
	const normalizedEmail = email.trim().toLowerCase();

	if (!normalizedFirstName || !normalizedLastName) {
		return {
			ok: false,
			status: 400,
			message: 'First name and last name are required'
		};
	}

	const existingUser = await prisma.user.findUnique({
		where: { email: normalizedEmail }
	});

	if (existingUser) {
		return {
			ok: false,
			status: 409,
			message: 'Email is already registered'
		};
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const user = await prisma.user.create({
		data: {
			firstName: normalizedFirstName,
			lastName: normalizedLastName,
			email: normalizedEmail,
			password: hashedPassword
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			createdAt: true
		}
	});

	const tokens = await issueTokenPair(user.id);

	return {
		ok: true,
		status: 201,
		data: {
			user,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken
		}
	};
}

export async function loginUser({ email, password }) {
	const normalizedEmail = email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail }
	});

	if (!user) {
		return {
			ok: false,
			status: 401,
			message: 'Invalid email or password'
		};
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);

	if (!isPasswordValid) {
		return {
			ok: false,
			status: 401,
			message: 'Invalid email or password'
		};
	}

	const tokens = await issueTokenPair(user.id);

	return {
		ok: true,
		status: 200,
		data: {
			user: toPublicUser(user),
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken
		}
	};
}

export async function refreshAuthToken(refreshToken) {
	if (!refreshToken || typeof refreshToken !== 'string') {
		return {
			ok: false,
			status: 400,
			message: 'Refresh token is required'
		};
	}

	const payload = verifyRefreshToken(refreshToken);

	if (!payload || !payload.userId) {
		return {
			ok: false,
			status: 401,
			message: 'Invalid or expired refresh token'
		};
	}

	const tokenHash = hashRefreshToken(refreshToken);
	const stored = await prisma.refreshToken.findUnique({
		where: { tokenHash }
	});

	if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== payload.userId) {
		return {
			ok: false,
			status: 401,
			message: 'Invalid or expired refresh token'
		};
	}

	await prisma.refreshToken.update({
		where: { id: stored.id },
		data: { revokedAt: new Date() }
	});

	const tokens = await issueTokenPair(payload.userId);

	return {
		ok: true,
		status: 200,
		data: {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken
		}
	};
}

export async function logoutUser(refreshToken) {
	if (!refreshToken || typeof refreshToken !== 'string') {
		return {
			ok: false,
			status: 400,
			message: 'Refresh token is required'
		};
	}

	const tokenHash = hashRefreshToken(refreshToken);

	await prisma.refreshToken.updateMany({
		where: {
			tokenHash,
			revokedAt: null
		},
		data: {
			revokedAt: new Date()
		}
	});

	return {
		ok: true,
		status: 200,
		data: {
			message: 'Logged out successfully'
		}
	};
}

export async function getUserPublicById(userId) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
				firstName: true,
				lastName: true,
			email: true,
			createdAt: true
		}
	});

	if (!user) {
		return {
			ok: false,
			status: 404,
			message: 'User not found'
		};
	}

	return {
		ok: true,
		status: 200,
		data: user
	};
}

export async function deleteUserAccount(userId) {
	const existingUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true }
	});

	if (!existingUser) {
		return {
			ok: false,
			status: 404,
			message: 'User not found'
		};
	}

	await prisma.user.delete({
		where: { id: existingUser.id }
	});

	return {
		ok: true,
		status: 200,
		data: {
			message: 'Account deleted successfully'
		}
	};
}
