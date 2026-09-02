import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Required for `output: "export"`. */
export const dynamic = "force-static";

/**
 * Web app manifest (App Router file convention — Next prepends `basePath`).
 *
 * v0.7 ships an installable manifest. A full offline service worker is a v0.8
 * commitment; the manifest never claims live updates when offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.full}`,
    short_name: BRAND.name,
    description: BRAND.blurb,
    start_url: "./",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#234b6e",
    icons: [{ src: "favicon.ico", sizes: "48x48", type: "image/x-icon" }],
  };
}
