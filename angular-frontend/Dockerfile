FROM node:20-alpine AS builder
WORKDIR /app
COPY angular-frontend/package.json angular-frontend/package-lock.json ./
RUN npm ci

COPY angular-frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
COPY angular-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]