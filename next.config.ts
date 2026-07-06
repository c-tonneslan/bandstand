import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; an unrelated lockfile higher up the tree otherwise
  // makes Next infer the wrong root and mis-trace the standalone output.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
