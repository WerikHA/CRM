# Base image
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build frontend
COPY . .
RUN npm run build

# Final image
FROM node:22-slim

WORKDIR /app

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy server and necessary files
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./.env.example

# Install only production dependencies
RUN npm install --omit=dev && npm install -g tsx

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["tsx", "server.ts"]
