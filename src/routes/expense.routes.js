import express from 'express';
import {
    createExpenseHandler,
    deleteExpenseHandler,
    getExpense,
    getExpenses,
    updateExpenseHandler
} from '../controllers/expense.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createExpenseSchema,
    deleteExpenseSchema,
    getExpenseSchema,
    listExpensesSchema,
    updateExpenseSchema
} from '../validations/expense.validation.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(listExpensesSchema), getExpenses);
router.get('/:id', validate(getExpenseSchema), getExpense);
router.post('/', validate(createExpenseSchema), createExpenseHandler);
router.patch('/:id', validate(updateExpenseSchema), updateExpenseHandler);
router.delete('/:id', validate(deleteExpenseSchema), deleteExpenseHandler);

export default router;