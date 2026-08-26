import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF export routes read src/assets/logo.png via fs at request
  // time (react-pdf needs real bytes, not a Next.js static-import URL),
  // which Vercel's automatic file tracing doesn't reliably pick up on
  // its own — declare it explicitly so the serverless bundle includes it.
  outputFileTracingIncludes: {
    "/api/**": ["./src/assets/logo.png"],
  },
};

export default nextConfig;
