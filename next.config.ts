import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./src/assets/motor360-logo-compact.png"],
  },
};

export default nextConfig;
