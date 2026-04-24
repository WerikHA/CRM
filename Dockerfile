# Use a Node base image with TypeScript support
FROM node:20-slim

# Install system dependencies for Baileys/Sharp if needed (though not strictly required for current setup)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
