# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine AS development

# COPY --from=build /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

# Serve stage
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/nginx_conf.template

CMD echo "window.env = { VITE_API_URL: '$VITE_API_URL', VITE_AUTH_API_URL: '$VITE_AUTH_API_URL', VITE_REDIRECT_URI: '$VITE_REDIRECT_URI' }" > /usr/share/nginx/html/.env.js && nginx -g "daemon off;"
