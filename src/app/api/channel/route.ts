import { NextResponse } from "next/server";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CHANNEL
 *
 * The delivery address is never sent to the browser. It is read from the
 * server environment inside this handler and appears in no markup, no client
 * bundle, no JSON payload and no error message. A scraper reading the page
 * source finds nothing to harvest.
 *
 * Defence in depth, cheapest check first:
 *   1. honeypot field — filled in means a bot
 *   2. dwell time     — a human cannot compose a message in two seconds
 *   3. shape          — required fields, length bounds, header-injection guard
 *   4. rate limit     — sliding window per client, plus a global ceiling
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Limits ──────────────────────────────────────────────────────────────── */

const LIMITS = {
  name: 80,
  replyTo: 160,
  message: 4000,
  messageMin: 12,
  /** A genuine visitor takes longer than this to write anything. */
  minDwellMs: 2500,
  /** Anything older than this is a replayed or stale form. */
  maxDwellMs: 1000 * 60 * 60 * 6,
  perClient: { max: 3, windowMs: 1000 * 60 * 15 },
  global: { max: 60, windowMs: 1000 * 60 * 15 },
};

/* ── Rate limiting ────────────────────────────────────────────────────────
   In-memory and therefore per-instance: this bounds abuse from a single
   client against a single server, not a distributed flood. On a multi-region
   deployment, back this with a shared store. It is deliberately the last line
   of defence rather than the first. */

type Window = { hits: number[]; };
const buckets = new Map<string, Window>();
let globalHits: number[] = [];

function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    buckets.set(key, b);
    return false;
  }
  b.hits.push(now);
  buckets.set(key, b);

  // Opportunistic sweep so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.hits.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return true;
}

function allowGlobal(): boolean {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < LIMITS.global.windowMs);
  if (globalHits.length >= LIMITS.global.max) return false;
  globalHits.push(now);
  return true;
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}

/* ── Delivery ─────────────────────────────────────────────────────────────
   Two transports, chosen by whichever environment variables are present.
   Neither address nor key is ever echoed back to the client. */

/**
 * Transports, in the order they are tried. The first one whose environment
 * variables are present wins. In every case the destination is resolved here,
 * on the server, and never reaches the browser.
 */
type Transport = {
  id: string;
  ready: () => boolean;
  send: (p: Payload) => Promise<boolean>;
};

/** Telegram parses HTML, so anything the sender typed has to be neutralised. */
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const body = (p: Payload) =>
  [`From: ${p.name}`, `Reply to: ${p.replyTo}`, `Meta: ${p.meta}`, "", p.message].join("\n");

const TRANSPORTS: Transport[] = [
  {
    // Best deliverability, and the sender domain is one you own. Free tier is
    // 3,000 emails a month. Requires a verified domain.
    id: "resend",
    ready: () => Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO),
    send: async (p) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM || "princey.dev <channel@princey.dev>",
          to: [process.env.CONTACT_TO],
          reply_to: p.replyTo,
          subject: `princey.dev channel message from ${p.name}`,
          text: body(p),
        }),
      });
      return res.ok;
    },
  },
  {
    // Free, no domain to verify, one access key by email. 250 a month.
    id: "web3forms",
    ready: () => Boolean(process.env.WEB3FORMS_KEY),
    send: async (p) => {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY,
          subject: `princey.dev channel message from ${p.name}`,
          from_name: p.name,
          email: p.replyTo,
          message: body(p),
        }),
      });
      return res.ok;
    },
  },
  {
    // Free tier is 50 submissions a month. The form id hides the destination.
    id: "formspree",
    ready: () => Boolean(process.env.FORMSPREE_ID),
    send: async (p) => {
      const res = await fetch(`https://formspree.io/f/${process.env.FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: p.name, email: p.replyTo, message: p.message, meta: p.meta }),
      });
      return res.ok;
    },
  },
  {
    // Free, unlimited, and it lands on a phone in about a second. No email
    // deliverability to worry about at all.
    id: "telegram",
    ready: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    send: async (p) => {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            parse_mode: "HTML",
            // Everything the sender typed is escaped: a name containing a
            // tag must not be able to inject markup into the notification.
            text: [
              "<b>princey.dev</b> · new message",
              "",
              `<b>From</b> ${esc(p.name)}`,
              `<b>Reply</b> <code>${esc(p.replyTo)}</code>`,
              "",
              esc(p.message),
              "",
              `<i>${esc(p.meta)}</i>`,
            ].join("\n"),
            disable_web_page_preview: true,
          }),
        },
      );
      return res.ok;
    },
  },
  {
    // Free, unlimited, no account at all: set CONTACT_TO and confirm the first
    // message. Because this call is made server side, the address still never
    // reaches the browser.
    id: "formsubmit",
    ready: () => Boolean(process.env.CONTACT_TO),
    send: async (p) => {
      const res = await fetch(
        `https://formsubmit.co/ajax/${encodeURIComponent(process.env.CONTACT_TO!)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `princey.dev channel message from ${p.name}`,
            _template: "table",
            _captcha: "false",
            Name: p.name,
            "Reply to": p.replyTo,
            Message: p.message,
            Meta: p.meta,
          }),
        },
      );
      return res.ok;
    },
  },
  {
    // Anything that accepts JSON: a Discord or Slack webhook, an automation
    // runner, your own endpoint.
    id: "webhook",
    ready: () => Boolean(process.env.CONTACT_WEBHOOK_URL),
    send: async (p) => {
      const res = await fetch(process.env.CONTACT_WEBHOOK_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "princey.dev", ...p }),
      });
      return res.ok;
    },
  },
];

type Payload = { name: string; replyTo: string; message: string; meta: string };

const active = () => TRANSPORTS.filter((t) => t.ready());

const configured = () => active().length > 0;

/**
 * Every configured transport fires, not just the first. Telegram for the
 * notification that reaches a pocket in a second, email for the copy that is
 * still there next week: those are different jobs and both are worth doing.
 *
 * Success means at least one landed. One transport being down does not lose
 * somebody's message, and a failure is only reported when every route failed.
 */
async function deliver(p: Payload): Promise<{ ok: boolean; sent: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    active().map(async (t) => ({ id: t.id, ok: await t.send(p) })),
  );

  const sent: string[] = [];
  const failed: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) sent.push(r.value.id);
    else if (r.status === "fulfilled") failed.push(r.value.id);
    else failed.push("unknown");
  }
  return { ok: sent.length > 0, sent, failed };
}

/* ── Status ───────────────────────────────────────────────────────────────
   The console asks before it opens, so it can report honestly rather than
   accepting a message it cannot deliver. */

export function GET() {
  const routes = active();
  return NextResponse.json(
    {
      status: routes.length ? "ready" : "offline",
      // How many routes, never which: naming the transport would leak a hint
      // about where the messages actually land.
      routes: routes.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* ── Send ─────────────────────────────────────────────────────────────────── */

const fail = (code: string, status: number, hint: string) =>
  NextResponse.json({ ok: false, code, hint }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail("malformed", 400, "Transmission unreadable.");
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // 1 — Honeypot. The field is present in the DOM, hidden from people and
  //     from assistive technology, and left empty by anyone real.
  if (str(body.company) !== "") {
    // Answer as though it succeeded: a bot learns nothing from a 200.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 2 — Dwell time.
  const opened = Number(body.openedAt);
  const dwell = Number.isFinite(opened) ? Date.now() - opened : NaN;
  if (!Number.isFinite(dwell) || dwell < LIMITS.minDwellMs || dwell > LIMITS.maxDwellMs) {
    return fail("timing", 400, "Channel timing rejected. Reopen and try again.");
  }

  // 3 — Shape.
  const name = str(body.name);
  const replyTo = str(body.replyTo);
  const message = str(body.message);

  if (!name || name.length > LIMITS.name) {
    return fail("name", 422, "A name is required.");
  }
  // Deliberately permissive: the goal is a usable reply address, not to
  // adjudicate RFC 5322. Anything with a local part, an @ and a dotted domain.
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(replyTo) || replyTo.length > LIMITS.replyTo) {
    return fail("replyTo", 422, "A reachable reply address is required.");
  }
  // Header injection guard — the reply address is passed to a mail transport.
  if (/[\r\n]/.test(name) || /[\r\n]/.test(replyTo)) {
    return fail("shape", 422, "Invalid characters.");
  }
  if (message.length < LIMITS.messageMin || message.length > LIMITS.message) {
    return fail("message", 422, `Message must be ${LIMITS.messageMin}–${LIMITS.message} characters.`);
  }

  // 4 — Rate limit.
  if (!allowGlobal()) {
    return fail("busy", 429, "Channel saturated. Try again shortly.");
  }
  if (!allow(clientKey(request), LIMITS.perClient.max, LIMITS.perClient.windowMs)) {
    return fail("rate", 429, "Too many transmissions. Try again later.");
  }

  if (!configured()) {
    // Never pretend a message was delivered when it was not.
    return fail("offline", 503, "Channel offline. No delivery route is configured.");
  }

  try {
    const result = await deliver({
      name,
      replyTo,
      message,
      meta: `dwell ${Math.round(dwell / 1000)}s · ${request.headers.get("user-agent")?.slice(0, 120) ?? "unknown agent"}`,
    });
    if (!result.ok) {
      return fail("transport", 502, "Delivery refused upstream. Try again shortly.");
    }
    if (result.failed.length) {
      // Partial success is still success for the sender, but it belongs in the
      // server log so a broken route does not go unnoticed for weeks.
      console.warn(
        `[channel] delivered via ${result.sent.join(", ")}; failed: ${result.failed.join(", ")}`,
      );
    }
  } catch {
    // The upstream error may contain the destination address. It is never
    // forwarded to the client.
    return fail("transport", 502, "Delivery failed. Try again shortly.");
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
