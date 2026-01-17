# Etap 1: build
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma/schema.prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Etap 2: runtime
FROM node:20-slim AS runner
WORKDIR /app

COPY package*.json package-lock.json* ./
RUN npm ci --omit=dev

COPY prisma/schema.prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
