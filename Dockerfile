# Stage 1: Build the React app
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and lockfile and install deps
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Build React app for production
RUN npm run build

# Stage 2: Serve the React app with nginx
FROM nginx:alpine

# Copy the build output to nginx html directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
