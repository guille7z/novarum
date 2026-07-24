ARG BUN_VERSION=1.3.9

FROM oven/bun:${BUN_VERSION} AS build

WORKDIR /app

COPY apps/anchor/package.json ./package.json

RUN bun install --no-save --production

COPY apps/anchor/src ./src
COPY apps/anchor/modules ./modules
COPY apps/anchor/utils ./utils

RUN bun build --compile --minify --target bun --outfile anchor src/index.ts

FROM gcr.io/distroless/base-debian13 AS runtime

WORKDIR /app

COPY --from=build /app/anchor ./anchor
COPY apps/anchor/drizzle ./drizzle

ENV NODE_ENV=production

CMD ["/app/anchor"]

EXPOSE 5049
