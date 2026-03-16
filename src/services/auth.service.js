import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';

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

	const token = generateToken({ userId: user.id });

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

	const token = generateToken({ userId: user.id });

	return {
		ok: true,
		status: 200,
		data: {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
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
