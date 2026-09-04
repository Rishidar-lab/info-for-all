import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

/**
 * Web app manifest (App Router file convention — Next prepends `basePath`).
 *
 * v0.7 ships an installable manifest; v0.8 added an offline shell; v0.9 (Phase U)
 * caches the last successful snapshot and shows an unmistakable OFFLINE — NOT
 * LIVE banner. The manifest never claims live updates when offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.full}`,
    short_name: BRAND.name,
    description: BRAND.blurb,
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#234b6e",
    icons: [
      { src: "favicon.ico", sizes: "48x48", type: "image/x-icon" },
      // A scalable maskable icon — Chrome/Android accept SVG for installability.
      { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
