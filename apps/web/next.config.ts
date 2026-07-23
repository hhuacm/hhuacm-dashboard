import {
  getServerInternalUrl,
  shouldUseLocalWebApiRewrites,
} from "@hhuacm-dashboard/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    if (!shouldUseLocalWebApiRewrites()) {
      return [];
    }

    const serverInternalUrl = getServerInternalUrl();

    return [
      {
        destination: `${serverInternalUrl}/trpc/:path*`,
        source: "/trpc/:path*",
      },
      {
        destination: `${serverInternalUrl}/api/auth/:path*`,
        source: "/api/auth/:path*",
      },
    ];
  },
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
};

export default nextConfig;
