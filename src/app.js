import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import router from './routes/auth.route.js'
import incomeRoutes from './routes/income.routes.js'
import expenseRoutes from './routes/expense.routes.js'
import reportRoutes from './routes/report.routes.js'

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))

app.get('/',(req,res) => {
    res.status(200).json({message: 'Welcome to FinTrack API'})
})

app.use('/api/auth', router)
app.use('/api/v1/incomes', incomeRoutes)
app.use('/api/v1/expenses', expenseRoutes)
app.use('/api/v1/reports', reportRoutes)

export default app