import express from 'express';
import {
    createIncomeHandler,
    deleteIncomeHandler,
    getIncome,
    getIncomes,
    updateIncomeHandler
} from '../controllers/income.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getIncomes);
router.get('/:id', getIncome);
router.post('/', createIncomeHandler);
router.patch('/:id', updateIncomeHandler);
router.delete('/:id', deleteIncomeHandler);

export default router;