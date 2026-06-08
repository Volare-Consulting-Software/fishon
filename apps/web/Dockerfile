# syntax=docker/dockerfile:1
# Lambda-ready image for apps/web. Build context is the monorepo root:
#   docker build -f apps/web/Dockerfile .

FROM public.ecr.aws/docker/library/node:22-slim AS build
WORKDIR /app
# Core depends on playwright; keep its browser binaries out of the image.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
# prebuild hook compiles packages/core first.
RUN npm run build:web

FROM public.ecr.aws/docker/library/node:22-slim
# Lambda Web Adapter translates Lambda events <-> HTTP. Inert outside Lambda,
# so the same image runs locally: docker run -p 8080:8080 <image>
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV NODE_ENV=production \
    PORT=8080 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
