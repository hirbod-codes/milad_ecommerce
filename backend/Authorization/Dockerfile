FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json
COPY ./.env ./.env

CMD npm run dev

FROM node:18-alpine AS production_build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

RUN npm run build

# Remove dev dependencies
RUN npm prune --production

FROM node:18-alpine AS production

WORKDIR /app

COPY --from=production_build /app/node_modules ./node_modules
COPY --from=production_build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

COPY ./convert_secret_to_env.sh /usr/local/bin/convert_secret_to_env.sh
RUN chmod +x /usr/local/bin/convert_secret_to_env.sh

CMD . /usr/local/bin/convert_secret_to_env.sh && node dist/index.js
