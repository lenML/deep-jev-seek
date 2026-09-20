# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY . .
RUN bunx pnpm@10.12.4 install --no-frozen-lockfile
RUN bunx pnpm@10.12.4 --filter @lenml/jevseek build
RUN bunx pnpm@10.12.4 --filter @lenml/jevseek-server build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=bun:bun /app/apps/server/dist/index.js /app/index.js

USER bun
EXPOSE 3000

CMD ["bun", "/app/index.js"]
