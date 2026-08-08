import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Bun selects these web exports at runtime; include them in Next's Node trace.
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.bun/@libsql+isomorphic-fetch@*/node_modules/@libsql/isomorphic-fetch/**/*",
      "../../node_modules/.bun/@libsql+isomorphic-ws@*/node_modules/@libsql/isomorphic-ws/**/*",
    ],
  },
  typedRoutes: true,
  reactCompiler: true,
};

export default nextConfig;
