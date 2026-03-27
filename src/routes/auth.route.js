import express from 'express';
import { login, logout, me, refresh, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
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

export default router;