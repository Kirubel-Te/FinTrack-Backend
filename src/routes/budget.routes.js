import express from 'express';
import {
    createBudgetHandler,
    deleteBudgetHandler,
    getBudgetsHandler,
    getBudgetSummaryHandler,
    updateBudgetHandler
} from '../controllers/budget.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    budgetSummarySchema,
    createBudgetSchema,
    deleteBudgetSchema,
    listBudgetsSchema,
    updateBudgetSchema
} from '../validations/budget.validation.js';

const router = express.Router();

router.use(requireAuth);

router.get('/summary', validate(budgetSummarySchema), getBudgetSummaryHandler);
router.post('/', validate(createBudgetSchema), createBudgetHandler);
router.get('/', validate(listBudgetsSchema), getBudgetsHandler);
router.patch('/:id', validate(updateBudgetSchema), updateBudgetHandler);
router.delete('/:id', validate(deleteBudgetSchema), deleteBudgetHandler);

export default router;
