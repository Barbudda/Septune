"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidGlass } from "@/components/ui/liquid-glass";

// Inlined (not imported from lib/support/knowledge) so the support prompt
// and knowledge base never ship in the client bundle.
const SUGGESTED_QUESTIONS = [
  "What does Septune do?",
  "Is it safe for my main branch?",
  "Which frameworks are supported?",
  "How do the modification levels work?",
];

type Source = { title: string; url: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Ask about audits, pull requests, modification levels, security or pricing. Answers come straight from the Septune docs.",
};

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Strip client-only fields (sources) — the API expects role+content.
          messages: next
            .filter((m) => m !== GREETING)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.answer ??
            "Sorry, something went wrong. Please try again in a moment.",
          sources: Array.isArray(data.sources) ? data.sources.slice(0, 3) : [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I couldn't reach support just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-chat fixed bottom-4 right-4 z-[90] print:hidden">
      {open && (
        <LiquidGlass
          refraction={{ bezel: 20, thickness: 22, blur: 22 }}
          className="mb-3 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
            <span className="lg lg-thin grid size-8 place-items-center rounded-full">
              <MessageCircle className="size-4 text-molten" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-fg">Septune support</div>
              <div className="text-[11px] text-fg-subtle">
                Answers from the Septune docs
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-full text-fg-subtle hover:bg-white/[0.07] hover:text-fg"
              aria-label="Close support chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "lg max-w-[85%] rounded-[20px] px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "lg-molten rounded-br-md"
                      : "lg-thin rounded-bl-md text-fg-muted",
                  )}
                >
                  <span className="whitespace-pre-wrap">{m.content}</span>
                  {m.role === "assistant" && !!m.sources?.length && (
                    <span className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                      {m.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          className="lg lg-thin inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] text-molten-bright transition-[filter] hover:brightness-125"
                          title={s.title}
                        >
                          {s.title}
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="lg lg-thin flex items-center gap-1 rounded-[20px] rounded-bl-md px-3.5 py-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-fg-subtle"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested questions (only before the first user turn) */}
            {messages.length === 1 && !loading && (
              <div className="space-y-2 pt-1">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="lg lg-thin block w-full rounded-2xl px-3 py-2 text-left text-xs text-fg-muted transition-[filter,color] hover:text-fg hover:brightness-125"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Septune…"
              className="lg lg-thin h-9 flex-1 rounded-full px-4 text-sm text-fg outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-molten-bright"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="lg lg-molten grid size-9 shrink-0 place-items-center rounded-full transition-[filter] hover:brightness-110 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </LiquidGlass>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "lg ml-auto flex size-12 items-center justify-center rounded-full transition-[filter] hover:brightness-110",
          open ? "lg-thin text-fg-muted hover:text-fg" : "lg-molten",
        )}
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
