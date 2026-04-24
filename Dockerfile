# Dockerfile for AgencyFlow CRM (Full-Stack Vite + Express)

# Stage 1: Build Frontend
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production

# In a real production, you might compile server.ts to JS, 
# but Node 22 + tsx works great for this setup.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/db ./db

EXPOSE 3000

ENV NODE_ENV=production
# We use npx tsx to ensure we use the version in node_modules
CMD ["npx", "tsx", "server.ts"]
