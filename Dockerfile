FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies (production). If you want dev deps, change to npm ci
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Try to generate Prisma client if possible (safe fallback if Prisma not installed)
RUN node scripts/prisma-generate-if-available.cjs || true

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
