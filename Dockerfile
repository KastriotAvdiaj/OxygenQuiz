# Stage 1: Install production dependencies with npm ci
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package.json and lockfile and install deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Vite frontend
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY .env.production .env.production

RUN npm run build

# Stage 3: Serve the compiled assets with nginx
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
