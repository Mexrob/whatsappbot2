# Build Stage for Frontend
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/

# Copy built frontend from build-stage
COPY --from=build-stage /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001
CMD ["node", "server/index.js"]
