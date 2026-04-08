FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends adb ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  MVIEW_HOST=0.0.0.0 \
  MVIEW_PORT=3000 \
  MVIEW_SCRCPY_SERVER_FILE=/app/docker/assets/scrcpy-server.jar

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
COPY docker/assets/scrcpy-server.jar ./docker/assets/scrcpy-server.jar

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@mobile-viewer/server"]
