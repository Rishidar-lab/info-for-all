import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * IFA ships as a fully static site (no server, no API routes).
 *
 * `PAGES_BASE_PATH` is set by the GitHub Pages workflow to the project-site
 * sub-path (e.g. `/info-for-all`). Left unset for local `out/` serving and
 * for hosts that serve the site at the domain root.
 */
const basePath = process.env.PAGES_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  // Pin the workspace root — avoids Next picking up a stray lockfile in $HOME.
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
