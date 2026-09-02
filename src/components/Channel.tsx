"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SITE } from "@/content/site";
import { useGsapSetup, gsap, prefersReducedMotion, trackSpecular } from "@/lib/motion";
import { useToast } from "./Toast";
import { EngravedRule, CoordinateRose } from "./Ornament";

type Status = "unknown" | "ready" | "offline";
type Phase = "closed" | "booting" | "open" | "sending" | "sent" | "error";

const BOOT = [
  "> establishing channel",
  "> handshake ok",
  "> transport encrypted",
  "> recipient resolved server-side",
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OPEN A CHANNEL
 *
 * No address is published. Not the email, not the telephone number, not a
 * street. The console asks the server whether a route exists, boots, takes a
 * message, and hands it to an API that knows where to send it.
 *
 * A scraper reading this page finds a form and nothing else.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Channel() {
  const [status, setStatus] = useState<Status>("unknown");
  const [phase, setPhase] = useState<Phase>("closed");
  const [bootLine, setBootLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef<number>(0);

  const sectionRef = useRef<HTMLElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  useGsapSetup();

  /* Entrance for the statement. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-c]", { opacity: 1, yPercent: 0 });
        return;
      }
      gsap.fromTo(
        "[data-c='line']",
        { yPercent: 110, opacity: 0, rotate: 1.1 },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 1.5,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 76%", once: true },
        },
      );
      gsap.fromTo(
        "[data-c='panel']",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: { trigger: el, start: "top 62%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const el = consoleRef.current;
    return el ? trackSpecular(el) : undefined;
  }, [phase]);

  /* Ask the server whether there is anywhere to send. */
  const probe = useCallback(async () => {
    try {
      const res = await fetch("/api/channel", { cache: "no-store" });
      const json = (await res.json()) as { status?: string };
      setStatus(json.status === "ready" ? "ready" : "offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  const open = useCallback(async () => {
    setPhase("booting");
    setBootLine(0);
    openedAt.current = Date.now();
    void probe();

    if (prefersReducedMotion()) {
      setBootLine(BOOT.length);
      setPhase("open");
      return;
    }
    // The console comes up line by line, the way a console does.
    let i = 0;
    const tick = () => {
      i += 1;
      setBootLine(i);
      if (i < BOOT.length) window.setTimeout(tick, 220);
      else window.setTimeout(() => setPhase("open"), 320);
    };
    window.setTimeout(tick, 240);
  }, [probe]);

  useEffect(() => {
    if (phase === "open") firstFieldRef.current?.focus();
  }, [phase]);

  /* A drop of ink blooms where the message left, then the pulse travels the
     interface and disappears. */
  const fireInk = useCallback(() => {
    const host = consoleRef.current;
    if (!host || prefersReducedMotion()) return;
    const drop = document.createElement("span");
    drop.className = "ink";
    drop.style.left = "50%";
    drop.style.top = "62%";
    host.appendChild(drop);
    window.setTimeout(() => drop.remove(), 1300);
  }, []);

  const firePulse = useCallback(() => {
    const el = pulseRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { xPercent: -110, opacity: 0 },
      {
        xPercent: 110,
        opacity: 1,
        duration: 1.05,
        ease: "power2.inOut",
        onComplete: () => gsap.to(el, { opacity: 0, duration: 0.35 }),
      },
    );
  }, []);

  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (phase === "sending") return;
      setError(null);
      setPhase("sending");

      const form = new FormData(e.currentTarget);
      try {
        const res = await fetch("/api/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            replyTo: form.get("replyTo"),
            message: form.get("message"),
            company: form.get("company"), // honeypot
            openedAt: openedAt.current,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; hint?: string; code?: string };

        if (res.ok && json.ok) {
          setPhase("sent");
          fireInk();
          firePulse();
          push({
            tone: "ok",
            title: "Message received.",
            body: "It reached a person, not a queue. Expect a reply.",
          });
          return;
        }

        // Say which part went wrong and what to do about it. "Something went
        // wrong" tells the sender nothing and leaves them with no next move.
        const hint = json.hint || "Transmission refused.";
        const advice: Record<string, string> = {
          timing: "Close the channel and open it again, then resend.",
          name: "Add a name and try again.",
          replyTo: "Check the reply address and try again.",
          message: "Adjust the length and try again.",
          rate: "You have sent a few already. Try again in a little while.",
          busy: "The channel is saturated. Try again in a moment.",
          offline: "Nothing you did. The channel has no delivery route set up yet.",
          transport: "Your message was not lost, it just was not accepted. Try again shortly.",
        };
        setError(hint);
        setPhase("error");
        push({
          tone: "fail",
          title: json.code === "offline" ? "Channel offline." : "Not sent.",
          body: `${hint} ${advice[json.code ?? ""] ?? ""}`.trim(),
        });
      } catch {
        const hint = "No route to the channel. Check your connection and try again.";
        setError(hint);
        setPhase("error");
        push({ tone: "fail", title: "Could not reach the channel.", body: hint });
      }
    },
    [phase, firePulse, fireInk, push],
  );

  const statusText =
    phase === "sending"
      ? "TRANSMITTING…"
      : phase === "sent"
        ? "CHANNEL STATUS: DELIVERED"
        : phase === "error"
          ? "TRANSMISSION HELD"
          : status === "offline"
            ? "CHANNEL STATUS: OFFLINE"
            : status === "ready"
              ? "CHANNEL STATUS: READY"
              : "CHANNEL STATUS: …";

  return (
    <section ref={sectionRef} id="contact" className="movement ch" aria-labelledby="ch-heading">
      <div className="shell">
        <span className="t-label ch-eyebrow">§ 10 / Contact</span>

        <h2 id="ch-heading" className="ch-statement t-display">
          <span className="sr-only">Let&rsquo;s build something that should not exist yet.</span>
          <span aria-hidden="true">
            <span className="ch-mask">
              <span data-c="line">LET&rsquo;S BUILD</span>
            </span>
            <span className="ch-mask">
              <span data-c="line" className="ch-statement-b">
                SOMETHING THAT
              </span>
            </span>
            <span className="ch-mask">
              <span data-c="line" className="ch-statement-c">
                SHOULD NOT EXIST YET.
              </span>
            </span>
          </span>
        </h2>

        <EngravedRule className="ch-rule" />

        <div className="ch-body" data-c="panel">
          <div ref={consoleRef} className="ch-console glass glass-plate corners">
            <span ref={pulseRef} className="ch-pulse" aria-hidden="true" />

            <div className="ch-console-bar">
              <span className={`ch-led ch-led-${phase === "sent" ? "ok" : status}`} aria-hidden="true" />
              <span className="t-label ch-status" role="status" aria-live="polite">
                {statusText}
              </span>
            </div>

            {phase === "closed" ? (
              <div className="ch-closed">
                <p className="ch-invite">
                  No address is published here. Not an email, not a number.
                  Open a channel and it reaches me directly.
                </p>
                <button type="button" className="ch-open" onClick={open}>
                  <span className="ch-open-glyph" aria-hidden="true" />
                  Open a channel
                </button>
              </div>
            ) : null}

            {phase !== "closed" ? (
              <div className="ch-boot" aria-hidden={phase !== "booting"}>
                {BOOT.slice(0, bootLine).map((l) => (
                  <p key={l} className="ch-boot-line">
                    {l}
                  </p>
                ))}
              </div>
            ) : null}

            {phase === "open" || phase === "sending" || phase === "error" ? (
              <form className="ch-form" onSubmit={submit} noValidate>
                {/* Honeypot: off-screen, not hidden with display:none so a bot
                    that checks computed style still fills it in. */}
                <div className="ch-trap" aria-hidden="true">
                  <label htmlFor="ch-company">Company</label>
                  <input
                    id="ch-company"
                    name="company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="ch-field">
                  <label className="t-label" htmlFor="ch-name">
                    Identify
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="ch-name"
                    name="name"
                    type="text"
                    required
                    maxLength={80}
                    autoComplete="name"
                    placeholder="who is transmitting"
                  />
                </div>

                <div className="ch-field">
                  <label className="t-label" htmlFor="ch-reply">
                    Reply route
                  </label>
                  <input
                    id="ch-reply"
                    name="replyTo"
                    type="email"
                    required
                    maxLength={160}
                    autoComplete="email"
                    placeholder="where the answer should land"
                  />
                </div>

                <div className="ch-field">
                  <label className="t-label" htmlFor="ch-message">
                    Payload
                  </label>
                  <textarea
                    id="ch-message"
                    name="message"
                    required
                    rows={5}
                    minLength={12}
                    maxLength={4000}
                    placeholder="what should exist that doesn't yet"
                  />
                </div>

                {error ? (
                  <p className="ch-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="ch-send"
                  disabled={phase === "sending" || status === "offline"}
                >
                  <span className="ch-send-glyph" aria-hidden="true" />
                  {phase === "sending" ? "Transmitting" : "Transmit"}
                </button>

                {status === "offline" ? (
                  <p className="t-meta ch-offline">
                    No delivery route is configured on this deployment yet. One
                    environment variable turns the channel on. See .env.example
                    for the options.
                  </p>
                ) : null}
              </form>
            ) : null}

            {phase === "sent" ? (
              <div className="ch-sent" role="status">
                <p className="ch-sent-line">MESSAGE RECEIVED.</p>
                <p className="t-meta ch-sent-note">
                  It reached a person, not a queue. Expect a reply.
                </p>
                <span className="t-hand ch-sent-hand" aria-hidden="true">
                  talk soon
                </span>
              </div>
            ) : null}
          </div>

          <div className="ch-colophon">
            <p className="ch-name">{SITE.name}</p>
            <ul className="ch-roles">
              {SITE.roles.map((r) => (
                <li key={r}>{r.toUpperCase()}</li>
              ))}
            </ul>
            <p className="t-meta ch-place">{SITE.location}</p>
            <CoordinateRose className="ch-rose" />
          </div>
        </div>
      </div>
    </section>
  );
}
