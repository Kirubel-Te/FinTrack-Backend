import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';

export async function registerUser({ email, password }) {
	const normalizedEmail = email.trim().toLowerCase();

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
			email: normalizedEmail,
			password: hashedPassword
		},
		select: {
			id: true,
			email: true,
			createdAt: true
		}
	});

	const token = generateToken({ userId: user.id, email: user.email });

	return {
		ok: true,
		status: 201,
		data: {
			user,
			token
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

	const token = generateToken({ userId: user.id, email: user.email });

	return {
		ok: true,
		status: 200,
		data: {
			user: {
				id: user.id,
				email: user.email,
				createdAt: user.createdAt
			},
			token
		}
	};
}

export async function getUserPublicById(userId) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
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
