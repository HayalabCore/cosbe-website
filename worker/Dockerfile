# Content Studio worker. Build from the repo root:
#   docker build -f worker/Dockerfile -t studio-worker .
FROM node:24-slim

# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV HUSKY=0

COPY package.json yarn.lock ./
COPY prisma ./prisma
# Runs `prisma generate` via postinstall. Dev dependencies are kept: tsx runs the worker.
# Clean yarn's download cache in the same layer, or it stays in the image (~4 GB).
RUN yarn install --frozen-lockfile && yarn cache clean

COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "worker/main.ts"]
