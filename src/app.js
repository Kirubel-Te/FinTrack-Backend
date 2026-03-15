import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import router from './routes/auth.route.js'

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))

app.get('/',(req,res) => {
    res.status(200).json({message: 'Welcome to FinTrack API'})
})

app.use('/api/auth', router)

export default app