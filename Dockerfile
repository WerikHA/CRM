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
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/db ./db

# Install tsx for running typescript server in production if needed, 
# or pre-compile it. We will use tsx as per package.json.
RUN npm install -g tsx

EXPOSE 3000

ENV NODE_ENV=production
CMD ["tsx", "server.ts"]
