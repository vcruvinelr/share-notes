FROM node:23-alpine as base

# Declare Coolify build arguments
ARG COOLIFY_URL
ARG COOLIFY_FQDN
ARG SERVICE_FQDN_BACKEND
ARG SERVICE_FQDN_FRONTEND
ARG SERVICE_FQDN_KEYCLOAK
ARG SERVICE_URL_BACKEND
ARG SERVICE_URL_FRONTEND
ARG SERVICE_URL_KEYCLOAK

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Development stage
FROM base as development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base as build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine as production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
