FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies, generate Prisma client, then remove dev dependencies.
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

RUN DATABASE_URL=postgresql://user:password@localhost:5432/fintrack?schema=public npx prisma generate
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
