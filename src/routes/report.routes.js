import express from 'express';
import {
    getCategories,
    getMonthlySummary,
    getSummary
} from '../controllers/report.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { monthlyReportSchema } from '../validations/report.validation.js';

const router = express.Router();

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/monthly', validate(monthlyReportSchema), getMonthlySummary);
router.get('/categories', getCategories);

export default router;
