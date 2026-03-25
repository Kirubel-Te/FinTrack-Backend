import express from 'express';
import {
    createExpenseHandler,
    deleteExpenseHandler,
    getExpense,
    getExpenses,
    updateExpenseHandler
} from '../controllers/expense.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getExpenses);
router.get('/:id', getExpense);
router.post('/', createExpenseHandler);
router.patch('/:id', updateExpenseHandler);
router.delete('/:id', deleteExpenseHandler);

export default router;