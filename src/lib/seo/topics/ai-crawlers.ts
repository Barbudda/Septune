import type { TopicPage } from "./types";

/**
 * Pages sur les robots d'IA (hub /ai-crawlers) et la page llms.txt (hub
 * /guides). Chaque fait vient de la documentation de l'opérateur lue le
 * 2026-11-02 ; les listes d'IP et les fichiers llms.txt cités ont été
 * téléchargés le même jour. Le classement recherche / entraînement décrit ici
 * suit AI_BOTS dans src/lib/audit/geo.ts.
 *
 * Laissé de côté faute de source officielle : la chaîne User-Agent complète
 * des robots d'Anthropic (sa page ne donne que les jetons), les plages d'IP de
 * Meta (sa page n'en publie pas), le comportement d'OAI-AdsBot face à
 * robots.txt, et tout système d'IA qui lirait llms.txt (aucun opérateur ne le
 * déclare).
 */

const READ = "2026-11-02";
const OPENAI_BOTS = "https://developers.openai.com/api/docs/bots";
const RFC_9309 = "https://www.rfc-editor.org/rfc/rfc9309.html";
const VERCEL_AI_CRAWLER = "https://vercel.com/blog/the-rise-of-the-ai-crawler";

export const AI_CRAWLERS: TopicPage[] = [
  {
    hub: "ai-crawlers",
    slug: "gptbot",
    title: "Block GPTBot in robots.txt, keep ChatGPT search",
    h1: "How to block GPTBot in robots.txt, and what the block leaves open",
    description:
      "GPTBot is OpenAI's training crawler. The robots.txt group that blocks it, why OAI-SearchBot and ChatGPT-User need their own lines, and how to check it.",
    answer:
      "Add a group for it to robots.txt: `User-agent: GPTBot` on one line, `Disallow: /` on the next. OpenAI says disallowing GPTBot indicates your content should not be used to train its generative AI foundation models. ChatGPT search is unaffected: it relies on OAI-SearchBot, a separate token, and pages opened at a user's request come through ChatGPT-User.",
    sections: [
      {
        heading: "The robots.txt group that blocks GPTBot",
        blocks: [
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap.xml",
          },
          {
            kind: "p",
            text: "RFC 9309 makes the user-agent match case-insensitive, so `gptbot` works as well. Once a group names GPTBot, GPTBot reads only that group and skips `*`, which is what you want here. To keep only part of the site out of training, list paths in place of `/`, for example `Disallow: /blog/`.",
          },
          {
            kind: "code",
            label: "app/robots.ts (Next.js)",
            code: 'import type { MetadataRoute } from "next";\n\nexport default function robots(): MetadataRoute.Robots {\n  return {\n    rules: [\n      { userAgent: "GPTBot", disallow: "/" },\n      { userAgent: "*", allow: "/" },\n    ],\n    sitemap: "https://www.example.com/sitemap.xml",\n  };\n}',
          },
          {
            kind: "p",
            text: "Next.js writes each entry of `rules` as its own `User-Agent` group, according to its robots.txt reference (last updated May 1, 2026).",
          },
        ],
      },
      {
        heading: "What is GPTBot used for?",
        blocks: [
          {
            kind: "p",
            text: "OpenAI's crawler page says GPTBot crawls content that may be used in training its generative AI foundation models. It gives this header as an example and warns that the version number may change:",
          },
          {
            kind: "code",
            label: "User-Agent header",
            code: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot",
          },
          {
            kind: "p",
            text: "Filter logs on the `GPTBot` substring, never on the whole header. When it fetches robots.txt, GPTBot may add a `robots.txt` marker to that string, so the file's own requests stand out even in logs that drop the path.",
          },
        ],
      },
      {
        heading: "Does blocking GPTBot remove you from ChatGPT?",
        blocks: [
          {
            kind: "p",
            text: "No. OpenAI runs four agents and states that the GPTBot and OAI-SearchBot settings are independent of each other:",
          },
          {
            kind: "list",
            items: [
              "GPTBot: model training. Blocking it is the training opt-out and nothing else.",
              "OAI-SearchBot: ChatGPT's search features. Blocking it keeps your pages out of ChatGPT search answers, apart from navigational links; see [OAI-SearchBot](/ai-crawlers/oai-searchbot).",
              "ChatGPT-User: visits a page when someone asks ChatGPT or a Custom GPT about it. OpenAI says robots.txt rules may not apply to these user-initiated visits, and that this agent plays no part in deciding what appears in search.",
              "OAI-AdsBot: checks landing pages submitted as ChatGPT ads against OpenAI's policies and visits only those pages. OpenAI says its data isn't used for training.",
            ],
          },
          {
            kind: "p",
            text: "When both GPTBot and OAI-SearchBot are allowed, OpenAI may reuse one crawl for both purposes. Seeing only one of the two in your logs therefore says nothing about whether the other is allowed.",
          },
        ],
      },
      {
        heading: "Three ways the block fails without an error",
        blocks: [
          {
            kind: "list",
            items: [
              "`User-agent: *` followed by `Disallow: /` does stop GPTBot, but Googlebot falls back to that same group when no group names it, so the site leaves Google too. If Search Console starts reporting [Blocked by robots.txt](/search-console/blocked-by-robots-txt), look for this line first.",
              "A single-page app that answers `/robots.txt` with its `index.html` publishes no rules at all: GPTBot reads HTML where the group should be. See [robots.txt served as HTML](/docs/issues/indexing-robots-html).",
              "A typo such as `User agent: GPTBot` (no hyphen) or `Disalow: /` makes the line unreadable, parsers skip it, and the group stops applying.",
            ],
          },
        ],
      },
      {
        heading: "Check that the block is live",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s https://www.example.com/robots.txt | grep -i -A2 '^user-agent: gptbot'\ngrep 'GPTBot' /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn",
          },
          {
            kind: "p",
            text: "Any client can send GPTBot's user agent. OpenAI publishes the addresses GPTBot crawls from at `https://openai.com/gptbot.json`, a JSON object whose `prefixes` array holds `ipv4Prefix` ranges. This script checks an address from your logs against it (tested with Node 24):",
          },
          {
            kind: "code",
            label: "check-ip.mjs",
            code: 'import { BlockList } from "node:net";\n\n// node check-ip.mjs https://openai.com/gptbot.json 20.171.206.10\nconst [url, ip] = process.argv.slice(2);\nconst { prefixes } = await (await fetch(url)).json();\nconst ranges = new BlockList();\nfor (const p of prefixes) {\n  const [net, bits] = p.ipv4Prefix.split("/");\n  ranges.addSubnet(net, Number(bits), "ipv4");\n}\nconsole.log(ranges.check(ip, "ipv4") ? `${ip} is in ${url}` : `${ip} is NOT in ${url}`);',
          },
          {
            kind: "p",
            text: "OpenAI gives a delay of about 24 hours for search after a robots.txt change and states none for GPTBot. Septune's [AI-access check](/audit) applies the same group precedence and files GPTBot under training crawlers, so a GPTBot block is shown for information and never lowers the score.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-blocks-google", "indexing-robots-html", "indexing-robots-format"],
    sources: [
      { label: "OpenAI, Overview of OpenAI crawlers", url: OPENAI_BOTS, read: READ },
      { label: "OpenAI, GPTBot IP ranges (gptbot.json)", url: "https://openai.com/gptbot.json", read: READ },
      { label: "RFC 9309, Robots Exclusion Protocol (2.2.1, the user-agent line)", url: RFC_9309, read: READ },
      { label: "Next.js docs, robots.txt file convention", url: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "ai-crawlers",
    slug: "oai-searchbot",
    title: "OAI-SearchBot: the crawler behind ChatGPT search",
    h1: "OAI-SearchBot: what it crawls, and what blocking it does to ChatGPT answers",
    description:
      "OAI-SearchBot decides whether ChatGPT search can show your pages: its user agent, IP list, robots.txt rules, the 24-hour delay, and what hides a site.",
    answer:
      "OAI-SearchBot is the crawler OpenAI uses to surface websites in ChatGPT's search features. OpenAI says sites that opt out of it won't be shown in ChatGPT search answers, though they can still appear as navigational links. Its robots.txt setting is independent of GPTBot, the training crawler, and a change takes about 24 hours to reach search.",
    sections: [
      {
        heading: "What OpenAI says OAI-SearchBot does",
        blocks: [
          {
            kind: "p",
            text: "OpenAI recommends allowing OAI-SearchBot in robots.txt and allowing requests from the IP ranges it publishes at `https://openai.com/searchbot.json`. Its example user agent reads like desktop Chrome with the bot's token appended, and a second form marks the requests for robots.txt:",
          },
          {
            kind: "code",
            label: "User-Agent headers (the version may change)",
            code: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot\nMozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; robots.txt; +https://openai.com/searchbot",
          },
          {
            kind: "p",
            text: "Log filters and firewall rules should key on `OAI-SearchBot`, the part OpenAI names as the bot, and not on the browser-like prefix.",
          },
        ],
      },
      {
        heading: "What happens in ChatGPT when you block it",
        blocks: [
          {
            kind: "list",
            items: [
              "OAI-SearchBot disallowed: OpenAI says your pages are not shown in ChatGPT search answers, though they can still appear as navigational links.",
              "GPTBot disallowed, OAI-SearchBot allowed: ChatGPT search can still show and cite your pages, because the [GPTBot block](/ai-crawlers/gptbot) only concerns training.",
              "ChatGPT-User disallowed: OpenAI says this agent is not used to decide whether content may appear in search, and that robots.txt rules may not apply to it at all, since a user started the visit.",
            ],
          },
          {
            kind: "p",
            text: "OpenAI routes search opt-outs and automatic crawling through OAI-SearchBot alone. After a robots.txt edit, allow about 24 hours before judging the result in ChatGPT.",
          },
        ],
      },
      {
        heading: "How do I allow OAI-SearchBot without opening the rest of the site?",
        blocks: [
          {
            kind: "p",
            text: "Often by writing nothing: with no group of its own, OAI-SearchBot follows the `*` group. Adding a group just for it has a side effect. Under RFC 9309 a crawler that finds a group naming it obeys that group alone, so a lone `Allow: /` gives OAI-SearchBot more access than every other crawler. Repeat the paths you keep private:",
          },
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: *\nDisallow: /admin/\nDisallow: /search\n\nUser-agent: OAI-SearchBot\nDisallow: /admin/\nDisallow: /search",
          },
          {
            kind: "p",
            text: "Spell each repeated line exactly: a `Dissallow` meant to keep `/admin/` private is dropped by the parser, and OAI-SearchBot crawls the path ([robots.txt format errors](/docs/issues/indexing-robots-format)).",
          },
        ],
      },
      {
        heading: "Allowed in robots.txt, still invisible",
        blocks: [
          {
            kind: "p",
            text: "In the measurement Vercel and MERJ published in December 2024, none of OpenAI's crawlers executed JavaScript: they downloaded script files without running them. OpenAI's own page says nothing about rendering. A page whose text appears only after scripts run reaches OAI-SearchBot as an empty shell, the case described in [content that needs JavaScript](/docs/issues/framework-js-only-content). Prerendering the public routes is the fix, shown for [Vite + React](/frameworks/vite-react).",
          },
          {
            kind: "p",
            text: "A firewall or bot-protection layer can also answer it with a 403 or a challenge page while robots.txt says yes. Test the user-agent side from your own machine:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -s -o /dev/null -w '%{http_code}\\n' \\\n  -A 'Mozilla/5.0; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot' \\\n  https://www.example.com/pricing",
          },
          {
            kind: "p",
            text: "A 403 means a rule keyed on the user agent blocks it. A 200 proves less: protection that judges the source address treats your test differently from the real crawler, so compare with your firewall's logs for the ranges in `searchbot.json`.",
          },
        ],
      },
      {
        heading: "See what OAI-SearchBot received",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "grep 'OAI-SearchBot' /var/log/nginx/access.log | awk '{print $9, $7}' | sort | uniq -c | sort -rn | head",
          },
          {
            kind: "p",
            text: "In nginx's predefined `combined` log format, field 9 is the status code and field 7 the path. A robots.txt refusal produces no request at all, so 403 or 429 lines come from the server or the firewall. Septune's AI-access check counts both OAI-SearchBot and ChatGPT-User as search crawlers, and a robots.txt that disallows either one fails it.",
          },
        ],
      },
    ],
    rules: ["framework-js-only-content", "indexing-robots-format"],
    sources: [
      { label: "OpenAI, Overview of OpenAI crawlers", url: OPENAI_BOTS, read: READ },
      { label: "OpenAI, OAI-SearchBot IP ranges (searchbot.json)", url: "https://openai.com/searchbot.json", read: READ },
      { label: "RFC 9309, Robots Exclusion Protocol", url: RFC_9309, read: READ },
      { label: "Vercel, The rise of the AI crawler (December 17, 2024)", url: VERCEL_AI_CRAWLER, read: READ },
      { label: "nginx docs, ngx_http_log_module (the combined format)", url: "https://nginx.org/en/docs/http/ngx_http_log_module.html", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "ai-crawlers",
    slug: "claudebot",
    title: "ClaudeBot user agent: Anthropic's three crawlers",
    h1: "ClaudeBot user agent: what Anthropic documents about ClaudeBot, Claude-User and Claude-SearchBot",
    description:
      "Anthropic names three robots.txt tokens and publishes one IP list for all of them, but no full user-agent string. What each bot does and how to verify one.",
    answer:
      "ClaudeBot collects web content that may be used to train Anthropic's models; Claude-SearchBot indexes pages to improve Claude's search results; Claude-User fetches a page when a Claude user asks for it. Anthropic's crawler page names these three tokens but prints no full user-agent string, so match the token and check the source address against claude.com/crawling/bots.json.",
    sections: [
      {
        heading: "What Anthropic publishes, and what it leaves out",
        blocks: [
          {
            kind: "p",
            text: "Anthropic documents its crawlers in a help center article, dated April 7, 2026 when we read it. For each bot it gives the token, the purpose and what disabling it does, plus a link to an IP list. It prints no full User-Agent header for any of them. Third-party bot directories fill the gap with full strings that differ from one directory to the next, and none of them cites an Anthropic page. The token is the part Anthropic commits to, so filter on it:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "grep -E 'ClaudeBot|Claude-SearchBot|Claude-User' /var/log/nginx/access.log \\\n  | awk '{print $1}' | sort | uniq -c | sort -rn | head",
          },
          {
            kind: "p",
            text: "That lists the addresses sending any of the three tokens, busiest first. A header alone proves nothing, which is what the IP list further down is for.",
          },
        ],
      },
      {
        heading: "ClaudeBot, Claude-User and Claude-SearchBot: what blocking each one changes",
        blocks: [
          {
            kind: "list",
            items: [
              "ClaudeBot: Anthropic says restricting it signals that the site's future materials should be excluded from its AI model training datasets. The article says nothing about content collected earlier.",
              "Claude-SearchBot: disabling it prevents Anthropic from indexing your content for search optimization, which Anthropic says may reduce your visibility and accuracy in user search results.",
              "Claude-User: disabling it prevents Claude from retrieving your pages in response to a user's question, which may reduce your visibility for user-directed web search.",
            ],
          },
          {
            kind: "p",
            text: "Here Anthropic parts from OpenAI and Perplexity, which both say their user-triggered fetchers may not follow robots.txt. Anthropic says its bots honour robots.txt and presents Claude-User as the way site owners control user-initiated access. Compare [Perplexity-User](/ai-crawlers/perplexitybot).",
          },
        ],
      },
      {
        heading: "robots.txt for the common choices",
        blocks: [
          {
            kind: "p",
            text: "Refuse training, stay reachable for Claude's search and for users' requests:",
          },
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /",
          },
          {
            kind: "p",
            text: "Or keep ClaudeBot and slow it down. Anthropic supports the non-standard `Crawl-delay` extension and gives this example; Applebot, by comparison, doesn't follow the directive ([Applebot-Extended](/ai-crawlers/applebot-extended)).",
          },
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: ClaudeBot\nCrawl-delay: 1",
          },
          {
            kind: "p",
            text: "Anthropic asks for these lines on every subdomain you want to opt out. `docs.example.com/robots.txt` is a separate file from `www.example.com/robots.txt`, and a host that serves none gives the bots nothing to obey ([no robots.txt](/docs/issues/framework-robots-missing)).",
          },
        ],
      },
      {
        heading: "Why not block Anthropic's IP addresses instead?",
        blocks: [
          {
            kind: "p",
            text: "Anthropic warns that blocking the addresses its bots operate from may not work correctly or persistently guarantee an opt-out, because the block also stops them from reading your robots.txt. The opt-out Anthropic documents lives in robots.txt; the address list is for confirming who a visitor is.",
          },
        ],
      },
      {
        heading: "Verify that a request comes from Anthropic",
        blocks: [
          {
            kind: "p",
            text: "Anthropic publishes one list for all its bots at `https://claude.com/crawling/bots.json`, a `prefixes` array of `ipv4Prefix` ranges, and says an address on it indicates the crawler is coming from Anthropic. The list tells you the request is Anthropic's; the token in the header tells you which bot. When we tested, claude.com answered Python's default user agent with a 403, so fetch the list with curl and pipe it in:",
          },
          {
            kind: "code",
            label: "in_ranges.py",
            code: 'import ipaddress, json, sys\n\n# curl -s https://claude.com/crawling/bots.json | python3 in_ranges.py 216.73.216.10\nip = ipaddress.ip_address(sys.argv[1])\nprefixes = json.load(sys.stdin)["prefixes"]\nprint(any(ip in ipaddress.ip_network(p["ipv4Prefix"]) for p in prefixes))',
          },
          {
            kind: "p",
            text: "Septune's AI-access check files ClaudeBot under training and Claude-SearchBot and Claude-User under search, matching Anthropic's descriptions.",
          },
        ],
      },
    ],
    rules: ["framework-robots-missing"],
    sources: [
      {
        label: "Anthropic, Does Anthropic crawl data from the web, and how can site owners block the crawler? (April 7, 2026)",
        url: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler",
        read: READ,
      },
      { label: "Anthropic, crawler IP ranges (bots.json)", url: "https://claude.com/crawling/bots.json", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "ai-crawlers",
    slug: "perplexitybot",
    title: "PerplexityBot: user agents, IP ranges and robots.txt",
    h1: "PerplexityBot and Perplexity-User: what Perplexity documents, and what others have reported",
    description:
      "PerplexityBot indexes pages for Perplexity search; Perplexity-User fetches on request and generally ignores robots.txt. User agents, IP lists, WAF rules.",
    answer:
      "PerplexityBot is the crawler that surfaces and links websites in Perplexity's search results, and Perplexity says it isn't used to crawl content for AI foundation models. Perplexity-User fetches a page when a user's question needs it and, by Perplexity's own account, generally ignores robots.txt. To be cited, allow PerplexityBot in robots.txt and let its published IP ranges through your firewall.",
    sections: [
      {
        heading: "The two Perplexity user agents",
        blocks: [
          {
            kind: "code",
            label: "User-Agent headers (the version may change)",
            code: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)\nMozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
          },
          {
            kind: "p",
            text: "Each bot has its own IP list, `https://www.perplexity.ai/perplexitybot.json` and `https://www.perplexity.ai/perplexity-user.json`, in the same `prefixes` and `ipv4Prefix` shape OpenAI uses. Perplexity says each robots.txt setting works independently and that its systems may take up to 24 hours to reflect a change.",
          },
        ],
      },
      {
        heading: "What robots.txt can and can't do with Perplexity",
        blocks: [
          {
            kind: "list",
            items: [
              "PerplexityBot: Perplexity ties appearing in its search results to allowing this bot, and `User-agent: PerplexityBot` with `Disallow: /` is the documented way out.",
              "Perplexity-User: a `Disallow` for it records a preference that, in Perplexity's words, this fetcher generally ignores, since a user requested the fetch. Refusing these requests outright means dropping them at the firewall, which also stops Perplexity from reading a page a user pasted.",
              "Training: Perplexity lists no training crawler and says neither bot collects content for training AI foundation models, so a training opt-out has no Perplexity line to add.",
            ],
          },
          {
            kind: "p",
            text: "Anthropic documents the opposite for its own user fetcher, [Claude-User](/ai-crawlers/claudebot), which it says follows robots.txt.",
          },
        ],
      },
      {
        heading: "How do I let PerplexityBot through Cloudflare or AWS WAF?",
        blocks: [
          {
            kind: "p",
            text: "Perplexity's documentation pairs each user agent with its own IP ranges and recommends checking both. On Cloudflare, create a custom rule under Security, then Security rules, with this expression, each placeholder replaced by the current ranges separated by spaces:",
          },
          {
            kind: "code",
            label: "Cloudflare custom rule expression",
            code: '(http.user_agent contains "PerplexityBot" and ip.src in {<PerplexityBot IP ranges>}) or (http.user_agent contains "Perplexity-User" and ip.src in {<Perplexity-User IP ranges>})',
          },
          {
            kind: "list",
            items: [
              "Action: Skip, with the features to bypass selected, such as the remaining custom rules, managed rules, rate limiting rules or Super Bot Fight Mode rules.",
              "Order: above any custom rule that blocks or challenges, because a Skip rule only bypasses rules that run after it.",
              "Bot Fight Mode can't be skipped by a custom rule. If it's on, it can still challenge Perplexity's bots.",
              "On paid plans, keep each bot's ranges in an IP list (`ip.src in $perplexitybot`) and update the list instead of the rule. Free plans allow one custom list, too few for two bots.",
              "AWS WAF: one IP set per bot, then one rule per bot that combines the IP set match and a User-Agent string match with AND, action Allow, and a lower priority number than your blocking rules.",
            ],
          },
          {
            kind: "p",
            text: "The ranges change, and Perplexity asks you to refresh these rules from the two JSON files on a schedule.",
          },
        ],
      },
      {
        heading: "The undeclared-crawler report, and Perplexity's reply",
        blocks: [
          {
            kind: "p",
            text: "On August 4, 2025, Cloudflare published “Perplexity is using stealth, undeclared crawlers to evade website no-crawl directives”. Cloudflare reported that once its declared crawlers were blocked, Perplexity fetched pages with a generic Chrome-on-macOS user agent from addresses outside its published ranges, and that it answered questions about test domains whose robots.txt disallowed all crawling. Cloudflare removed Perplexity from its verified bots and added the pattern to its managed rules.",
          },
          {
            kind: "p",
            text: "The same day, Perplexity replied in “Agents or bots? Making sense of AI on the open web” that Cloudflare had confused it with 3 to 6 million daily requests from BrowserBase, a third-party cloud browser service Perplexity says it uses only occasionally, and argued that user-driven agents differ from crawlers. Neither post is crawler documentation, and they contradict each other. In practice, the published IP lists identify only the declared bots: a request with a browser user agent from an address outside them looks like any other visitor in your logs.",
          },
        ],
      },
      {
        heading: "Check what PerplexityBot gets from your site",
        blocks: [
          {
            kind: "code",
            label: "terminal",
            code: "curl -s https://www.perplexity.ai/perplexitybot.json \\\n  | python3 -c \"import json,sys; print('\\n'.join(p['ipv4Prefix'] for p in json.load(sys.stdin)['prefixes']))\"\ngrep 'PerplexityBot' /var/log/nginx/access.log | awk '{print $1, $9}' | sort | uniq -c",
          },
          {
            kind: "p",
            text: "The first command prints the current ranges, one per line, ready to paste into a WAF rule. The second counts, per address, the status codes served to requests carrying the token. In December 2024 Vercel and MERJ found that PerplexityBot didn't execute JavaScript, so make sure your pages hold their text in the HTML ([JavaScript-only content](/docs/issues/framework-js-only-content)).",
          },
        ],
      },
    ],
    rules: ["framework-js-only-content"],
    sources: [
      { label: "Perplexity docs, Perplexity Crawlers", url: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers", read: READ },
      { label: "Perplexity, PerplexityBot IP ranges (perplexitybot.json)", url: "https://www.perplexity.ai/perplexitybot.json", read: READ },
      { label: "Perplexity, Perplexity-User IP ranges (perplexity-user.json)", url: "https://www.perplexity.ai/perplexity-user.json", read: READ },
      {
        label: "Cloudflare blog, Perplexity is using stealth, undeclared crawlers (August 4, 2025)",
        url: "https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/",
        read: READ,
      },
      {
        label: "Perplexity blog, Agents or bots? Making sense of AI on the open web (August 4, 2025)",
        url: "https://www.perplexity.ai/hub/blog/agents-or-bots-making-sense-of-ai-on-the-open-web",
        read: READ,
      },
      { label: "Vercel, The rise of the AI crawler (December 17, 2024)", url: VERCEL_AI_CRAWLER, read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "ai-crawlers",
    slug: "applebot-extended",
    title: "Applebot-Extended: what the robots.txt token controls",
    h1: "Applebot-Extended: what disallowing it changes for Apple, and what it doesn't",
    description:
      "Applebot-Extended never crawls: it tells Apple whether Applebot's data may train its models. What a Disallow changes for Siri, Spotlight and Safari.",
    answer:
      "Applebot-Extended is a robots.txt token that no crawler sends: Apple says it doesn't crawl webpages and only governs how data crawled by Applebot is used. Disallowing it opts your content out of training Apple's foundation models. Applebot keeps crawling, your pages stay in Spotlight, Siri and Safari results, and Apple says these rules play no part in ranking.",
    sections: [
      {
        heading: "The opt-out line",
        blocks: [
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: Applebot-Extended\nDisallow: /",
          },
          {
            kind: "p",
            text: "Apple's own example disallows only `/private/`, which shows the token takes paths like any group; `/` covers the whole site. The opt-out applies to the general-purpose foundation models behind Apple Intelligence, Services and Developer Tools. Don't look for Applebot-Extended in access logs: the crawling itself is done by Applebot.",
          },
        ],
      },
      {
        heading: "What changes, and what stays the same",
        blocks: [
          {
            kind: "list",
            items: [
              "Training: your content is opted out of training Apple's general-purpose foundation models.",
              "Crawling: unchanged. Applebot still fetches your pages under whatever rules apply to it.",
              "Search: unchanged. Apple says pages that disallow Applebot-Extended can still be included in search results, and your content stays discoverable through Spotlight, Siri and Safari.",
              "Ranking: unchanged. Apple states that site rules for Applebot-Extended aren't considered in ranking for Search.",
              "AI answers: not covered. Apple may still use Applebot data as context when its models generate output, such as broad world knowledge answers in Siri and Search. The control for that is `nosnippet`.",
            ],
          },
        ],
      },
      {
        heading: "How do I keep pages out of Apple's AI answers?",
        blocks: [
          {
            kind: "p",
            text: "Apple honours `nosnippet` for Applebot: it then generates no description or web answer for the page, suggestions show only its title, and the content isn't used as context for AI-generated output. You lose the snippet in Apple's search as well. Send it in the page or as a header:",
          },
          {
            kind: "code",
            label: "HTML head",
            code: '<meta name="applebot" content="nosnippet">',
          },
          {
            kind: "code",
            label: "HTTP response header",
            code: "X-Robots-Tag: applebot: nosnippet",
          },
          {
            kind: "p",
            text: "The header is the only option for PDFs and images, where no meta tag fits; the [X-Robots-Tag guide](/guides/x-robots-tag) covers adding it on your server. To leave Apple's search entirely, `noindex` keeps a page out of Spotlight and Siri Suggestions, and the [noindex checker](/tools/noindex-checker) shows whether a page already carries one in its robots meta tag or X-Robots-Tag header.",
          },
          {
            kind: "p",
            text: "For paywalled pages, Apple reads schema.org `isAccessibleForFree: false` at page level: the page stays eligible for search, and Applebot won't use its content as context for AI output. Marking sections with `hasPart` isn't supported.",
          },
        ],
      },
      {
        heading: "Applebot follows your Googlebot rules",
        blocks: [
          {
            kind: "p",
            text: "Apple's page states that when robots.txt mentions Googlebot but not Applebot, Applebot follows the Googlebot instructions. A group written to keep Googlebot out, a leftover staging rule for instance, therefore removes the site from Spotlight and Siri as well ([robots.txt blocking Google](/docs/issues/indexing-robots-blocks-google)). Give Applebot its own group when the two should differ:",
          },
          {
            kind: "code",
            label: "public/robots.txt",
            code: "# Without its own group, Applebot would obey the Googlebot group\nUser-agent: Googlebot\nDisallow: /drafts/\n\nUser-agent: Applebot\nDisallow: /drafts/\nDisallow: /api/\n\nUser-agent: Applebot-Extended\nDisallow: /",
          },
          {
            kind: "p",
            text: "Two more points from Apple's page: Applebot doesn't follow `Crawl-delay`, and it may render pages in a browser, so robots.txt rules that block the JavaScript, CSS or XHR a page needs can leave it unable to render the content. Septune's AI-access check applies Apple's fallback: with no Applebot group, it evaluates Applebot against the Googlebot rules.",
          },
        ],
      },
      {
        heading: "Identify real Applebot traffic",
        blocks: [
          {
            kind: "p",
            text: "Apple identifies Applebot by reverse DNS in the `applebot.apple.com` domain, or by the CIDR list at `https://search.developer.apple.com/applebot.json`. Its example pair of lookups:",
          },
          {
            kind: "code",
            label: "terminal",
            code: "$ host 17.58.101.179\n179.101.58.17.in-addr.arpa domain name pointer 17-58-101-179.applebot.apple.com.\n$ host 17-58-101-179.applebot.apple.com\n17-58-101-179.applebot.apple.com has address 17.58.101.179",
          },
          {
            kind: "p",
            text: "The reverse lookup must end in `applebot.apple.com` and the forward lookup must return the same address. The user agent is a Safari-style string ending in `(Applebot/0.1; +http://www.apple.com/go/applebot)` in Apple's examples. One Apple agent ignores robots.txt by design: `iTMS`, which only crawls URLs tied to content registered on Apple Podcasts.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-blocks-google", "indexing-noindex"],
    sources: [
      { label: "Apple Support, About Applebot (published September 4, 2026)", url: "https://support.apple.com/en-us/119829", read: READ },
      { label: "Apple, Applebot IP ranges (applebot.json)", url: "https://search.developer.apple.com/applebot.json", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "ai-crawlers",
    slug: "meta-externalagent",
    title: "meta-externalagent: Meta's AI crawler and robots.txt",
    h1: "meta-externalagent: what Meta's crawlers do, and why blocking facebookexternalhit breaks link previews",
    description:
      "Meta runs five crawlers. What meta-externalagent collects, which ones may skip robots.txt, and why blocking facebookexternalhit strips link previews.",
    answer:
      "meta-externalagent is the crawler Meta uses for purposes such as training foundation AI models or improving products by indexing content directly. Refuse it with `User-agent: meta-externalagent` and `Disallow: /`. Keep facebookexternalhit allowed: it is the crawler that reads the title, description and image Meta shows when someone shares your link.",
    sections: [
      {
        heading: "Meta's five crawlers, as Meta describes them",
        blocks: [
          {
            kind: "list",
            items: [
              "facebookexternalhit: crawls the content of an app or website that was shared, and gathers, caches and displays its title, description and thumbnail image. Meta says it might bypass robots.txt when performing security or integrity checks.",
              "meta-externalagent: crawls for use cases such as training foundation AI models or improving products by indexing content directly.",
              "meta-externalfetcher: fetches individual links at a user's request, and may bypass robots.txt for that reason.",
              "meta-webindexer: navigates the web to improve Meta AI search results. Meta says allowing it helps it cite and link to your content in Meta AI's responses.",
              "meta-externalads: crawls for advertising and other business-related products.",
            ],
          },
          {
            kind: "p",
            text: "Meta lists each one in two forms: the bare token with its version, such as `meta-externalagent/1.1`, and the same followed by a link to its crawler documentation in parentheses. The share crawler's strings are `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)` and `facebookexternalhit/1.1`. Match on the token before the slash.",
          },
        ],
      },
      {
        heading: "robots.txt: refuse training, keep previews and Meta AI citations",
        blocks: [
          {
            kind: "code",
            label: "public/robots.txt",
            code: "User-agent: meta-externalagent\nDisallow: /\n\nUser-agent: meta-webindexer\nAllow: /\n\nUser-agent: facebookexternalhit\nAllow: /",
          },
          {
            kind: "p",
            text: "Meta describes one token for both training and product indexing, so this block covers both; its page offers no finer split. Meta's own example gives meta-externalagent and meta-externalads `Allow: /` with `Disallow: /private/`. Its crawlers may cache robots.txt for up to 24 hours, so a change can take a day to apply. Septune's AI-access check counts meta-webindexer as a search crawler and meta-externalagent as a training one.",
          },
        ],
      },
      {
        heading: "Why does blocking facebookexternalhit break link previews?",
        blocks: [
          {
            kind: "p",
            text: "The preview card is built from what this crawler reads: `og:title`, `og:description` and `og:image`, or, when a page has no Open Graph tags, Meta's best guess from the page. Meta's pages don't describe the blocked case, but a crawler that meets a robots.txt refusal, a 403 from a bot filter or a login page has none of that to read. Check bot-protection rules that challenge non-browser user agents: they reach this crawler too.",
          },
          {
            kind: "p",
            text: "Meta's crawler requirements add four conditions: the server must support gzip and deflate encodings, the Open Graph tags must sit within the first 1 MB of the page, the content must be crawlable within a few seconds, and the server should either return the tags within the byte range the crawler asks for or ignore its `Range` header. Images are cached by URL, so a new picture needs a new URL ([og:image not updating](/guides/og-image-not-updating)).",
          },
        ],
      },
      {
        heading: "Test what Meta's share crawler receives",
        blocks: [
          {
            kind: "p",
            text: "Meta gives this command to simulate a crawler request:",
          },
          {
            kind: "code",
            label: "terminal",
            code: 'curl -v --compressed -H "Range: bytes=0-524288" -H "Connection: close" -A "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" "$URL"',
          },
          {
            kind: "p",
            text: "Set `URL` to the page, then look for a 200 and the `og:` tags in the body. An `og:image` written as a relative path or on localhost is a separate problem, covered in [og:image URL](/docs/issues/meta-og-image-url). After a fix, the Sharing Debugger at `developers.facebook.com/tools/debug/` shows the tags Meta scraped and triggers a new scrape.",
          },
        ],
      },
      {
        heading: "Fetchers that robots.txt doesn't stop",
        blocks: [
          {
            kind: "p",
            text: "Two of Meta's agents may bypass robots.txt: meta-externalfetcher, because a user asked for the link, and facebookexternalhit during security or integrity checks. Meta asks site owners to allow-list either the user agent strings or, more securely, the IP addresses its crawlers use, yet its crawler page lists no addresses. OpenAI, Anthropic, Perplexity and Apple each publish a range file to check a request against; Meta's page offers nothing equivalent.",
          },
        ],
      },
    ],
    rules: ["meta-og-image-missing", "meta-og-image-url"],
    sources: [
      { label: "Meta for Developers, Meta Web Crawlers", url: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/", read: READ },
      { label: "Meta for Developers, A Guide to Sharing for Webmasters", url: "https://developers.facebook.com/docs/sharing/webmasters/", read: READ },
    ],
    published: READ,
    updated: READ,
  },
  {
    hub: "guides",
    slug: "llms-txt-examples",
    title: "llms.txt example files, and llms-full.txt explained",
    h1: "llms.txt examples from real documentation sites, and how llms-full.txt differs",
    description:
      "The llms.txt format from llmstxt.org, real files from Svelte, Cloudflare and Stripe, how llms-full.txt is built, and who says they read these files.",
    answer:
      "An llms.txt is a Markdown file served at /llms.txt: an H1 with the site's name (the only required part), a blockquote summary, optional notes, then H2 sections that list links as `[name](url): notes`. llms-full.txt is a separate convention, generated by documentation platforms such as Mintlify, that puts the full text of every page in one file. Google says Search ignores llms.txt.",
    sections: [
      {
        heading: "The llms.txt format, according to llmstxt.org",
        blocks: [
          {
            kind: "p",
            text: "Jeremy Howard published the proposal in September 2024; version 2, modified on August 10, 2026, keeps the same file shape. In order: an optional byte-order mark, an H1 with the project or site name (the only required section), a blockquote summary, any Markdown except headings, then H2 sections whose lists hold one `[name](url)` link per item, optionally followed by `:` and notes. A section named `Optional` holds links an agent can skip.",
          },
          {
            kind: "code",
            label: "llms.txt (illustrative)",
            code: "# Example CLI\n\n> Example CLI deploys static sites from the terminal and needs Node 20 or later.\n\nEvery command reads example.config.json from the project root.\n\n## Docs\n\n- [Install](https://example.com/docs/install.md): npm install and the first deploy\n- [Configuration](https://example.com/docs/config.md): every key of example.config.json\n\n## Optional\n\n- [Changelog](https://example.com/changelog.md)",
          },
          {
            kind: "p",
            text: "Version 2 also lets the file sit at any path and cover the pages under it (`/docs/llms.txt` covers `/docs/`), proposes Markdown copies of pages at `page.html.md` or `page.md`, and points to both with link relations, in HTML or as a header. The proposal starts from the observation that HTML wraps content in navigation, ads and JavaScript; a client-rendered page is the extreme case ([JavaScript-only content](/docs/issues/framework-js-only-content)).",
          },
          {
            kind: "code",
            label: "HTTP response header",
            code: 'Link: </docs/page.html.md>; rel="alternate"; type="text/markdown", </docs/llms.txt>; rel="describedby"',
          },
        ],
      },
      {
        heading: "Three real llms.txt files",
        blocks: [
          {
            kind: "p",
            text: "All three answered 200 on November 2, 2026, and each one bends the format its own way. Svelte (`svelte.dev/llms.txt`, about 1.7 KB) is a short router: it sends agents to the same documentation at three sizes, then to one file per package.",
          },
          {
            kind: "code",
            label: "svelte.dev/llms.txt (excerpt)",
            code: "## Documentation Sets\n\n- [Abridged documentation](https://svelte.dev/llms-medium.txt): A shorter version of the Svelte and SvelteKit documentation, with examples and non-essential content removed\n- [Compressed documentation](https://svelte.dev/llms-small.txt): A minimal version of the Svelte and SvelteKit documentation, with many examples and non-essential content removed\n- [Complete documentation](https://svelte.dev/llms-full.txt): The complete Svelte and SvelteKit documentation including all examples and additional content",
          },
          {
            kind: "p",
            text: "Cloudflare (`developers.cloudflare.com/llms.txt`, about 17 KB) is an index of indexes: 112 links, each to a product's own llms.txt, grouped under H2 headings. A plain sentence comes before the blockquote, an order the proposal doesn't list.",
          },
          {
            kind: "code",
            label: "developers.cloudflare.com/llms.txt (excerpt)",
            code: "# Cloudflare Developer Documentation\n\nExplore guides and tutorials to start building on Cloudflare's platform.\n\n> Each product below links to its own llms.txt, which contains a full index of that product's documentation pages and is the recommended way to explore a specific product's content.\n\n## Application performance\n\n- [Argo Smart Routing](https://developers.cloudflare.com/argo-smart-routing/llms.txt): Route web traffic across the fastest, most reliable network paths",
          },
          {
            kind: "p",
            text: "Stripe (`docs.stripe.com/llms.txt`, about 97 KB) links straight to Markdown versions of its pages and adds a section addressed to agents, “Instructions for Large Language Model Agents: Best Practices for integrating Stripe”, which tells them which APIs to prefer.",
          },
          {
            kind: "code",
            label: "docs.stripe.com/llms.txt (excerpt)",
            code: "## Docs\n\n- [Testing](https://docs.stripe.com/testing.md): Simulate payments to test your integration.\n- [API reference](https://docs.stripe.com/api.md)\n- [Receive payouts](https://docs.stripe.com/payouts.md): Set up your bank account to receive payouts.",
          },
        ],
      },
      {
        heading: "What is llms-full.txt?",
        blocks: [
          {
            kind: "p",
            text: "llmstxt.org doesn't define it. Version 1 of the proposal described a tool that expanded an llms.txt into one context file, and version 2 dropped that tooling. Documentation platforms generate the file instead: Mintlify, for one, serves `/llms-full.txt` combining the entire documentation site into a single file, each page with its title, source URL, description and full Markdown, next to its `/llms.txt` index. Mintlify caps its generated index files at 100,000 characters, a limit that doesn't apply to llms-full.txt.",
          },
          {
            kind: "p",
            text: "Sizes vary widely. On November 2, 2026, `svelte.dev/llms-full.txt` weighed about 1.3 MB, Cloudflare's site-wide `llms-full.txt` about 70 MB with a 5.2 MB file for Workers alone, and Stripe served none (404).",
          },
        ],
      },
      {
        heading: "Generate llms-full.txt from your Markdown docs",
        blocks: [
          {
            kind: "p",
            text: "If your docs are Markdown files, an llms-full.txt is a concatenation done at build time. This script (tested with Node 24) assumes plain Markdown without front matter and one H1 per file:",
          },
          {
            kind: "code",
            label: "scripts/llms-full.mjs",
            code: 'import { readdir, readFile, writeFile } from "node:fs/promises";\nimport { join } from "node:path";\n\nconst DOCS = "docs";\nconst BASE = "https://example.com/docs/";\n\nconst files = (await readdir(DOCS, { recursive: true }))\n  .filter((f) => f.endsWith(".md"))\n  .map((f) => f.replaceAll("\\\\", "/"))\n  .sort();\n\nconst pages = [];\nfor (const file of files) {\n  const body = (await readFile(join(DOCS, file), "utf8")).trim();\n  const title = body.match(/^#\\s+(.+)$/m)?.[1] ?? file;\n  pages.push(`# ${title}\\nSource: ${BASE}${file}\\n\\n${body.replace(/^#\\s+.+\\n+/, "")}`);\n}\nawait writeFile("public/llms-full.txt", pages.join("\\n\\n---\\n\\n") + "\\n");\nconsole.log(`${pages.length} pages written to public/llms-full.txt`);',
          },
          {
            kind: "p",
            text: "Run it before the build, so `public/llms-full.txt` ships in frameworks that copy `public/` to the output. For the index itself, [the llms.txt generator](/tools/llms-txt-generator) drafts one from your pages' titles and descriptions and checks an existing file's format.",
          },
        ],
      },
      {
        heading: "Which AI systems read llms.txt?",
        blocks: [
          {
            kind: "list",
            items: [
              "Google: its guide to generative AI features in Search says you don't need AI text files, and that maintaining llms.txt files will neither harm nor help visibility or rankings, because Google Search ignores them.",
              "Chrome Lighthouse: an agentic browsing audit flags a server error when fetching `/llms.txt` and marks itself not applicable on a 404, since the file is optional (page updated May 5, 2026).",
              "OpenAI, Anthropic, Perplexity, Apple and Meta: none of their crawler pages, read on November 2, 2026, says their crawlers fetch or use llms.txt.",
              "OpenAI, Anthropic and Google publish llms.txt files for their own developer docs, which llmstxt.org points to. Publishing one says nothing about reading anyone else's.",
            ],
          },
          {
            kind: "p",
            text: "The proposal's author writes that the files are used mostly at inference time, by agents assisting a user, coding agents first among them. That is his account, not an operator's. Whatever reads the file, it has to be served as text: an app that answers every path with its HTML shell answers `/llms.txt` the same way, as it does for [robots.txt](/docs/issues/indexing-robots-html).",
          },
          {
            kind: "code",
            label: "terminal",
            code: "curl -sI https://www.example.com/llms.txt | grep -i -E '^HTTP|^content-type'\ncurl -s https://www.example.com/llms.txt | head -3",
          },
          {
            kind: "p",
            text: "Expect a 200, a text content type and a first line that starts with `# ` followed by the site's name.",
          },
        ],
      },
    ],
    rules: ["indexing-robots-html", "framework-js-only-content"],
    sources: [
      { label: "llmstxt.org, The /llms.txt file, v2 (modified August 10, 2026)", url: "https://llmstxt.org/", read: READ },
      { label: "llmstxt.org, Changes (v2, August 2026)", url: "https://llmstxt.org/changes.html", read: READ },
      { label: "Google Search Central, Optimizing your website for generative AI features", url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide", read: READ },
      { label: "Google Search Central, AI features and your website", url: "https://developers.google.com/search/docs/appearance/ai-features", read: READ },
      { label: "Chrome for Developers, Lighthouse llms.txt audit (updated May 5, 2026)", url: "https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt", read: READ },
      { label: "Mintlify docs, llms.txt and llms-full.txt", url: "https://www.mintlify.com/docs/ai/llmstxt", read: READ },
      { label: "Svelte, llms.txt", url: "https://svelte.dev/llms.txt", read: READ },
      { label: "Cloudflare Developer Documentation, llms.txt", url: "https://developers.cloudflare.com/llms.txt", read: READ },
      { label: "Stripe Documentation, llms.txt", url: "https://docs.stripe.com/llms.txt", read: READ },
    ],
    published: READ,
    updated: READ,
  },
];
