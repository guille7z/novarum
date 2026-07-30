ARG BUN_VERSION=1.3.9

FROM oven/bun:${BUN_VERSION}-slim

WORKDIR /app

COPY apps/anchor/package.json ./package.json

RUN bun install --no-save --production

COPY apps/anchor/src ./src
COPY apps/anchor/modules ./modules
COPY apps/anchor/utils ./utils
COPY apps/anchor/drizzle ./drizzle

ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]

EXPOSE 5049
