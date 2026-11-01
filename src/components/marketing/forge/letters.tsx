type Part = { text: string; em?: boolean; br?: boolean };

/**
 * A headline whose letters clear from a blur one after the other (CSS,
 * .letters in globals.css). The letters are inline spans, so the font keeps
 * its kerning; the element that holds them carries the plain text as its
 * accessible name, and they are hidden from assistive tech.
 */
export function Letters({ parts, start = 0 }: { parts: Part[]; start?: number }) {
  let i = start;
  return (
    <span aria-hidden className="letters">
      {parts.map((part, p) => {
        const words = part.text.split(" ");
        // Words don't break inside; the spaces between them stay plain text, so lines wrap there.
        const body = words.flatMap((word, w) => [
          <span key={w} className="whitespace-nowrap">
            {Array.from(word).map((ch, c) => (
              <span key={c} className="l" style={{ "--i": i++ } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>,
          w < words.length - 1 ? " " : null,
        ]);
        const inner = part.em ? <em>{body}</em> : body;
        return (
          <span key={p}>
            {part.br ? <br /> : p > 0 ? " " : null}
            {inner}
          </span>
        );
      })}
    </span>
  );
}

/** The plain text of a Letters headline, for its aria-label. */
export const plain = (parts: Part[]) => parts.map((p) => p.text).join(" ");
