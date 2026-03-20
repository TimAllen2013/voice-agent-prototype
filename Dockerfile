FROM node:20-alpine

WORKDIR /usr/src/app

# Only copy package dependencies first to leverage Docker cache
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
