FROM oven/bun:1.4.2

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --omit=peer

COPY tsconfig.json ./
COPY src ./src

USER bun
CMD ["bun", "src/index.ts"]
