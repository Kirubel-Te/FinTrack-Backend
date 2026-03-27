import express from 'express';
import {
    createIncomeHandler,
    deleteIncomeHandler,
    getIncome,
    getIncomes,
    updateIncomeHandler
} from '../controllers/income.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createIncomeSchema,
    deleteIncomeSchema,
    getIncomeSchema,
    listIncomesSchema,
    updateIncomeSchema
} from '../validations/income.validation.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(listIncomesSchema), getIncomes);
router.get('/:id', validate(getIncomeSchema), getIncome);
router.post('/', validate(createIncomeSchema), createIncomeHandler);
router.patch('/:id', validate(updateIncomeSchema), updateIncomeHandler);
router.delete('/:id', validate(deleteIncomeSchema), deleteIncomeHandler);

export default router;