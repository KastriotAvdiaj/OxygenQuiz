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

# The API the bundle talks to is baked in at build time. `npm run build` reads .env.production
# (the live API), so a local image passes its own URL here; Vite lets a real environment
# variable override the .env file. docker-compose.yml sets it to the local API. A build arg is
# visible to RUN as an environment variable, and left unset it is absent, so a plain
# `docker build` still gets the production URL from .env.production.
ARG VITE_API_URL


RUN npm run build

# Stage 3: Serve the compiled assets with nginx
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
