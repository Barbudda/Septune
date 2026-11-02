"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The 23-second overview video, on demand. The trigger is plain CSS and the
 * <video> element only mounts inside the open dialog, so the page fetches
 * nothing for it until someone asks (the file is 4.7 MB).
 * Sources and the regenerate steps live outside the repo (Desktop/Septune-video).
 */
export function TourVideo({ className }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  // Native <dialog>: showModal() gives the focus trap, Escape and focus
  // restore to the trigger. Focus goes to the video so Space plays/pauses.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      const video = videoRef.current;
      if (video) {
        video.focus();
        // The click that opened the dialog allows sound. With reduced motion
        // the visitor starts it from the controls; a refused autoplay (Safari)
        // falls back to the same controls.
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          video.play().catch(() => {});
        }
      }
    } else if (!open && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex items-center gap-3 rounded-full py-1 pr-3 pl-1 font-mono text-[13px] text-fg-muted transition-colors duration-200 hover:text-fg",
          className,
        )}
      >
        {/* The logo square turned into a play button, over a glow of the accent. */}
        <span className="relative grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-code transition-colors duration-200 group-hover:border-molten/60">
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--color-molten)_40%,transparent),transparent_70%)] opacity-70 transition-opacity duration-200 group-hover:opacity-100"
          />
          <span className="relative grid size-5 place-items-center rounded-md bg-molten">
            <svg viewBox="0 0 12 12" className="size-2.5 translate-x-px text-ink" aria-hidden>
              <path d="M3 1.5v9L10.5 6z" fill="currentColor" />
            </svg>
          </span>
        </span>
        <span>watch the overview</span>
        <span className="text-fg-subtle">0:23</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="tour-video-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          // A click on the backdrop targets the <dialog> element itself.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="z-[120] m-auto w-[min(92vw,1120px)] max-w-none overflow-hidden rounded-2xl border border-border bg-bg p-0 text-fg shadow-2xl shadow-black/50 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        {open && (
          <>
            <div className="flex items-center gap-3 py-2 pr-2 pl-5">
              {/* Not an h2: the site's h2 style (Fraunces, tight tracking) is unreadable at this size. */}
              <p id="tour-video-title" className="text-sm font-medium text-fg">
                Septune in 23 seconds
              </p>
              <span className="hidden font-mono text-xs text-fg-subtle sm:inline">
                music, no narration
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto grid size-9 place-items-center rounded-full text-fg-subtle transition-colors duration-200 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
            <video
              ref={videoRef}
              src="/video/septune-tour.mp4"
              poster="/video/septune-tour-poster.webp"
              controls
              playsInline
              preload="auto"
              aria-describedby="tour-video-desc"
              className="block aspect-video w-full bg-bg"
            />
            <p id="tour-video-desc" className="sr-only">
              No narration. On screen: a robots noindex tag is typed into the head of
              /pricing. Septune reads septune.dev the way Googlebot finds it, and /pricing
              drops out: 93 pages read in 8 seconds. It checks where SEO breaks, in your
              editor, in every pull request and in production. The pull request check
              fails: /pricing became noindex, /docs canonical changed, score 91 to 84. The
              fix goes to your AI editor and /pricing can be indexed again. Three
              checkpoints (before you push, in the pull request, after the merge), 69
              checks from indexing to structured data, one site watched for free, a ready
              patch for Next.js, Nuxt, Astro, SvelteKit and Vite + React. Ship fast. Stay
              indexed. See what Septune finds on your site: no signup, 3 pages free, 69
              checks.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
