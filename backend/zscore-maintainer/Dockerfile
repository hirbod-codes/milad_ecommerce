FROM node:24-alpine AS build

WORKDIR /app

COPY ./package.json ./
COPY ./package-lock.json ./

COPY ./backend/zscore-maintainer/package.json ./backend/zscore-maintainer/package.json
COPY ./packages/utils/package.json ./packages/utils/package.json
COPY ./packages/mongodb/package.json ./packages/mongodb/package.json

RUN npm install

COPY . .

RUN npm run build:zscore-maintainer


FROM node:24-alpine AS development

COPY --from=build /app /app

WORKDIR /app

CMD ls -al /app && npm run dev:zscore-maintainer


FROM build AS production_build

WORKDIR /app

# Remove dev dependencies
RUN npm prune --production


FROM node:24-alpine AS production

WORKDIR /app

COPY --from=production_build /app/backend/zscore-maintainer/node_modules ./node_modules
COPY --from=production_build /app/backend/zscore-maintainer/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

COPY ./convert_secret_to_env.sh /usr/local/bin/convert_secret_to_env.sh
RUN chmod +x /usr/local/bin/convert_secret_to_env.sh

CMD . /usr/local/bin/convert_secret_to_env.sh && node -r ./bootstrap.js dist/index.js
