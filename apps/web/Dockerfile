# syntax=docker/dockerfile:1
# Lambda-ready image for apps/web. Build context is the monorepo root:
#   docker build -f apps/web/Dockerfile .

FROM public.ecr.aws/docker/library/node:22-slim AS build
WORKDIR /app
# Download Playwright's matched Chromium (used by core's weather scraper) into
# a stable path the runtime stage copies. The download includes the
# chrome-headless-shell binary the scraper launches.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN npm ci
RUN npx playwright install chromium
COPY . .
# prebuild hook compiles packages/core first.
RUN npm run build:web

FROM public.ecr.aws/docker/library/node:22-slim
# Lambda Web Adapter translates Lambda events <-> HTTP. Inert outside Lambda,
# so the same image runs locally: docker run -p 8080:8080 <image>
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV NODE_ENV=production \
    PORT=8080 \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
# Chromium's shared-library dependencies. install-deps apt-installs the correct
# set for this Debian release (version-proof); the global playwright is only a
# vehicle for it and is removed after. The browser binary itself is copied from
# the build stage, so its download is skipped here.
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i -g playwright@1.60.0 \
    && npx playwright install-deps chromium \
    && npm rm -g playwright \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /ms-playwright /ms-playwright
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
