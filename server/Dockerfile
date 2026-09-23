# Build from the repository root:
#   docker build -f server/Dockerfile -t nizhalpoocha-server .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci --workspace server --workspace shared --include-workspace-root=false
COPY shared shared
COPY server server
RUN npm run build -w server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/server/dist server/dist
WORKDIR /app/server
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
