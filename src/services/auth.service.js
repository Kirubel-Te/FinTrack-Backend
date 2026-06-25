import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import {
	generateAccessToken
} from '../utils/jwt.js';

function toPublicUser(user) {
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		createdAt: user.createdAt
	};
}

async function issueAccessToken(userId) {
	const accessToken = generateAccessToken({ userId });
	return { accessToken };
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

	const tokens = await issueAccessToken(user.id);

	return {
		ok: true,
		status: 201,
		data: {
			user,
			accessToken: tokens.accessToken
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

	const tokens = await issueAccessToken(user.id);

	return {
		ok: true,
		status: 200,
		data: {
			user: toPublicUser(user),
			accessToken: tokens.accessToken
		}
	};
}

export async function refreshAuthToken() {
	return {
		ok: false,
		status: 400,
		message: 'Refresh token functionality has been disabled. Please login again.'
	};
}

export async function logoutUser() {
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

export async function updateUserProfile(userId, { firstName, lastName, email }) {
	const existingUser = await prisma.user.findUnique({
		where: { id: userId }
	});

	if (!existingUser) {
		return {
			ok: false,
			status: 404,
			message: 'User not found'
		};
	}

	const data = {};

	if (firstName !== undefined) {
		data.firstName = firstName.trim();
	}

	if (lastName !== undefined) {
		data.lastName = lastName.trim();
	}

	if (email !== undefined) {
		const normalizedEmail = email.trim().toLowerCase();

		if (normalizedEmail !== existingUser.email) {
			const emailOwner = await prisma.user.findUnique({
				where: { email: normalizedEmail },
				select: { id: true }
			});

			if (emailOwner && emailOwner.id !== userId) {
				return {
					ok: false,
					status: 409,
					message: 'Email is already registered'
				};
			}
		}

		data.email = normalizedEmail;
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			createdAt: true
		}
	});

	return {
		ok: true,
		status: 200,
		data: updatedUser
	};
}

export async function updateUserPassword(userId, { currentPassword, newPassword }) {
	const existingUser = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			password: true
		}
	});

	if (!existingUser) {
		return {
			ok: false,
			status: 404,
			message: 'User not found'
		};
	}

	const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);

	if (!isCurrentPasswordValid) {
		return {
			ok: false,
			status: 401,
			message: 'Current password is incorrect'
		};
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await prisma.$transaction([
		prisma.user.update({
			where: { id: userId },
			data: {
				password: hashedPassword
			}
		}),
		prisma.refreshToken.updateMany({
			where: {
				userId,
				revokedAt: null
			},
			data: {
				revokedAt: new Date()
			}
		})
	]);

	return {
		ok: true,
		status: 200,
		data: {
			message: 'Password updated successfully. Please log in again.'
		}
	};
}
