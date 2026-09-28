import type { NextConfig } from "next";

/** Sub-path the site is served from (e.g. "/pxly-ink" on GitHub Pages), empty locally. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  basePath,
};

export default nextConfig;
