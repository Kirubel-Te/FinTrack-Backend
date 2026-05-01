import dotenv from 'dotenv'
import logger from './utils/logger.js'

dotenv.config()

const { default: app } = await import('./app.js')

const port = process.env.PORT || 3000

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`)
})