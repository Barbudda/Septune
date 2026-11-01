import { cn } from "@/lib/utils";

/**
 * The ground a chapter's picture is drawn on: a plate of verdigris with the
 * picture's material logged faintly across it, and a caption that says what
 * the picture shows. The picture itself is the forge field's, fitted into the
 * [data-stage] box; it may run past the plate's edge, the plate is only its
 * ground. The readout is rewritten by the chapter as the scroll moves the
 * picture (readouts.ts); the server HTML carries its end state.
 */
export function Plate({
  fig,
  caption,
  readout,
  ledger,
  band = false,
  ember = false,
  className,
}: {
  fig: number;
  caption: string;
  readout: string;
  /** Lines written behind the picture, split into a left and a right column. */
  ledger: readonly string[];
  /** Full-width band with its content in the page container (the deploy stream). */
  band?: boolean;
  /** Molten light where the picture's broken part sits (the fix). */
  ember?: boolean;
  className?: string;
}) {
  const half = Math.ceil(ledger.length / 2);
  const body = (
    <>
      {/* Inset so the picture stays on its plate. */}
      <div data-stage aria-hidden className={cn("relative min-h-0 flex-1", band ? "my-4 md:my-6" : "m-6 md:m-10")} />
      <figcaption
        data-reveal
        className="plate-caption relative z-10 flex flex-wrap items-baseline gap-x-4 gap-y-1 [--d:420]"
      >
        <span className="font-mono text-[12px] text-verdigris-soft">fig. {fig}</span>
        <span className="text-sm text-fg-muted">{caption}</span>
        <span data-readout className="font-mono text-[12.5px] text-molten-bright tabular-nums lg:ml-auto">
          {readout}
        </span>
      </figcaption>
    </>
  );

  return (
    <figure className={cn("plate", band ? "plate-band" : "plate-side", ember && "plate-ember", className)}>
      <Ledger lines={ledger.slice(0, half)} side="left" />
      <Ledger lines={ledger.slice(half)} side="right" />
      {band ? <div className="container-rf flex h-full flex-col">{body}</div> : body}
    </figure>
  );
}

/**
 * One column of the log. It moves up a line at a time as the chapter is
 * read (chapter.tsx), like a terminal printing; the list is written twice so
 * the column is never empty at the end.
 * Decoration (aria-hidden): the same words are in the page's text. Each line
 * is drawn by CSS from data-l, so contrast checks don't read a texture as
 * body text.
 */
function Ledger({ lines, side }: { lines: readonly string[]; side: "left" | "right" }) {
  if (!lines.length) return null;
  return (
    <div aria-hidden className={cn("ledger", side === "right" && "ledger-right")}>
      <div className="ledger-roll" data-n={lines.length}>
        {[0, 1].map((copy) =>
          lines.map((line, i) => (
            <p
              key={`${copy}-${i}`}
              data-l={line || " "}
              className={line.startsWith("-") || line.includes("critical") ? "text-molten-bright" : undefined}
            />
          )),
        )}
      </div>
    </div>
  );
}
