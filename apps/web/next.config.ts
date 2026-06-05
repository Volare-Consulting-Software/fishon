import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // The monorepo root, so standalone tracing picks up the workspace core package.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Server-only packages that must not be bundled (native/Node deps).
  serverExternalPackages: ["playwright", "tsyringe", "reflect-metadata"],
};

export default nextConfig;
