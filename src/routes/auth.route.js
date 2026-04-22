import express from 'express';
import {
	changePassword,
	deleteAccount,
	login,
	logout,
	me,
	refresh,
	register,
	updateProfile
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
	updatePasswordSchema,
	updateProfileSchema,
	loginSchema,
	refreshTokenBodySchema,
	registerSchema
} from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenBodySchema), refresh);
router.post('/logout', validate(refreshTokenBodySchema), logout);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, validate(updateProfileSchema), updateProfile);
router.patch('/password', requireAuth, validate(updatePasswordSchema), changePassword);
router.delete('/account', requireAuth, deleteAccount);

export default router;
