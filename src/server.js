import dotenv from 'dotenv'
import { execSync } from 'node:child_process'

dotenv.config()

try {
    execSync('npm run prisma:generate', { stdio: 'inherit' })
} catch (error) {
    console.error('Failed to generate Prisma client before startup')
    throw error
}

const { default: app } = await import('./app.js')

const port = process.env.PORT || 3000


app.listen(port,() => {
    console.log(`Server is running on port ${port}`)
})