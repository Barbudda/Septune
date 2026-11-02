import { ImageResponse } from "next/og";

// Branded 1200×630 social share card, generated at the edge. Next auto-emits
// og:image (+ width/height/alt/type) and, because twitter.card is
// summary_large_image, twitter:image too. Covers / and /pricing.
// The site's sky, its lime mark and the hero's words (docs/DESIGN.md, ADR 0008).
// NOTE: satori requires every element with >1 child to set display:flex, and
// only renders glyphs present in its bundled font (latin) — keep text ASCII.
export const alt = "Septune: technical SEO, on every deploy. Ship fast. Stay indexed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FRAMEWORKS = ["Next.js", "Nuxt", "Astro", "SvelteKit", "Vite + React"];
const LIME = "#d7f23c";
const NAVY = "#0e1a3f";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#172793",
          backgroundImage:
            "radial-gradient(700px 200px at 50% 36%, rgba(33, 123, 244, 0.85), rgba(33, 71, 229, 0) 100%), linear-gradient(180deg, #172793 0%, #1d36c5 24%, #2147e5 38%, #1c34bf 62%, #1a29a2 100%)",
          padding: "64px 80px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        {/* The mark and the name */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: LIME,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M9 7L5 12l4 5" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 7l4 5-4 5" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
              <circle cx="12" cy="12" r="1.6" fill={NAVY} />
            </svg>
          </div>
          <div style={{ fontSize: 38, fontWeight: 700 }}>Septune</div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: 22,
              color: "#dfe6ff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            technical SEO, on every deploy
          </div>
        </div>

        {/* The hero's words */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.02,
            }}
          >
            <div style={{ display: "flex" }}>Ship fast.</div>
            <div style={{ display: "flex", color: LIME }}>Stay indexed.</div>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 28, lineHeight: 1.4, color: "#dfe6ff", maxWidth: 980 }}>
            Septune crawls your site like a search engine and checks it where SEO breaks: in your editor, in every pull
            request, and in production.
          </div>
        </div>

        {/* The frameworks it writes patches for, and the light at the foot */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {FRAMEWORKS.map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#c9d4ff",
                  border: "1px solid rgba(255, 255, 255, 0.28)",
                  borderRadius: 999,
                  padding: "8px 18px",
                }}
              >
                {f}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              height: 3,
              width: "100%",
              backgroundImage: `radial-gradient(50% 100% at 50% 50%, #faffe2 0%, ${LIME} 45%, rgba(215, 242, 60, 0) 100%)`,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
