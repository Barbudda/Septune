import type { MetadataRoute } from "next";

/**
 * /manifest.webmanifest — completes the file-based metadata set and gives the
 * site an installable identity (name, theme, icon) for mobile/PWA surfaces.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Septune: automated technical SEO checks",
    short_name: "Septune",
    description:
      "Automated technical SEO for developers. Septune fails the pull request that would drop pages from Google and watches production after the merge.",
    start_url: "/",
    display: "standalone",
    // The sky's top and the lime mark (docs/DESIGN.md, ADR 0008).
    background_color: "#172793",
    theme_color: "#172793",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      // Full-bleed, no rounded corners: the platform applies its own mask.
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
