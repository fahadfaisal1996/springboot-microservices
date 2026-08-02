# Stage 1: Build Angular application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static bundle via Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
