FROM node:22-bookworm-slim AS build
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
COPY packages/story-domain/src /workspace/packages/story-domain/src
COPY packages/compatibility/src /workspace/packages/compatibility/src
COPY packages/asset-registry/src /workspace/packages/asset-registry/src
COPY server/operations/build-api.mjs ./operations/build-api.mjs
RUN node operations/build-api.mjs
RUN pnpm prune --prod --ignore-scripts

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/server/dist ./
COPY --from=build /workspace/server/node_modules ./node_modules
USER node
EXPOSE 4000
CMD ["node","main.mjs"]
