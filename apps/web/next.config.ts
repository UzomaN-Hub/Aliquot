import type { NextConfig } from "next";

import { serverConfig } from "./src/lib/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  // Same-origin proxy (decision 003): the browser calls /api/v1/* here,
  // Next.js forwards it to the FastAPI service's /v1/*.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${serverConfig.API_URL}/v1/:path*` }];
  },
};

export default nextConfig;
