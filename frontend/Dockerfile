# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY frontend/ .

# Build the application
RUN npm run build

# ============================================
# Runtime Stage - Serve with nginx
# ============================================
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a script to inject runtime environment variables
RUN apk add --no-cache bash

# Set the default backend URL for nginx
ENV VITE_API_URL=http://localhost:4000

EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
