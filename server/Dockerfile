FROM node:22.23.4-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --ignore-workspace --frozen-lockfile
COPY server/config.ts server/main.ts ./
COPY server/auth ./auth
COPY server/http ./http
COPY server/storage ./storage
COPY server/migrations ./migrations
COPY server/documents ./documents
COPY server/classroom ./classroom
COPY packages/story-domain/src /workspace/packages/story-domain/src
COPY packages/compatibility/src /workspace/packages/compatibility/src
COPY packages/asset-registry/src /workspace/packages/asset-registry/src
COPY server/operations/build-api.mjs ./operations/build-api.mjs
RUN node operations/build-api.mjs
RUN pnpm prune --prod --ignore-scripts

FROM node:22.23.4-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/server/dist ./
COPY --from=build /workspace/server/node_modules ./node_modules
USER node
EXPOSE 4000
CMD ["node","main.mjs"]
