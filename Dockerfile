FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY scripts/build.mjs scripts/build.mjs
COPY web web
COPY server/app.js server/app.js
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/site.sqlite
WORKDIR /app
COPY --from=build /app/dist dist
COPY server server
COPY migrations migrations
COPY package.json ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server/start.mjs"]
