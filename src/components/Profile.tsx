"use client";

import type { ReactNode } from "react";
import { SITE, RESUME_SECTIONS, PRINCIPLES, EXPERIENCE, DISCIPLINES } from "@/content/site";
import { Movement } from "./Movement";
import { CornerLeaf, EngravedRule, BotanicalDiagram, TopologyPlate } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROFILE
 * The biography as an editorial page, and the résumé as a Swiss publication
 * in seven movements. The numerals are dramatically oversized; everything
 * beside them stays precise.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Where each movement of the publication actually lives on the page. */
const CONTENTS_TARGET: Record<string, string> = {
  "01": "#profile",
  "02": "#pub-02",
  "03": "#pub-03",
  "04": "#work",
  "05": "#lab",
  "06": "#pub-06",
  "07": "#contact",
};

export function Profile() {
  return (
    <Movement id="profile" index="§ 06" title="Profile" aside="the person, precisely">
      {/* ── 01 The editorial identity plate ──────────────────────────── */}
      <div className="pf-card glass glass-plate" data-reveal>
        <CornerLeaf className="pf-leaf" />

        <div className="pf-identity">
          <div className="pf-identity-main">
            <span className="t-label">01 — Profile</span>
            <h3 className="pf-name">{SITE.name}</h3>
            <ul className="pf-roles">
              {SITE.roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <address className="pf-address">
              <span>{SITE.location}</span>
              <a href={`tel:${SITE.phoneHref}`}>{SITE.phone}</a>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </address>
          </div>

          {/* The handwriting against the grid — the signature of the brand. */}
          <div className="pf-annotation" aria-label="Working motto">
            <BotanicalDiagram className="pf-botanical" />
            <p className="t-hand pf-hand">
              {SITE.signature[0]}
              <br />
              {SITE.signature[1]}
            </p>
            <span className="t-meta pf-hand-caption">marginalia — undated</span>
          </div>
        </div>

        <EngravedRule className="pf-rule" />

        <p className="t-body pf-bio">
          I work across the whole surface of a product: the interface a person
          touches, the API it speaks to, the schema underneath, the pipeline
          that ships it, and — increasingly — the agentic layer that lets
          software act rather than merely answer. The three are not separate
          jobs. They are one system, and the seams between them are where
          products usually fail.
        </p>
      </div>

      {/* ── 02 Core stack ────────────────────────────────────────────── */}
      <PublicationSection index="02" title="Core Stack">
        <div className="pf-stack">
          {DISCIPLINES.map((d) => (
            <div key={d.index} className="pf-stack-col" data-reveal>
              <span className="t-label pf-stack-head">
                {d.index} — {d.title}
              </span>
              <ul className="pf-stack-list">
                {d.groups.flatMap((g) => g.items).map((it) => (
                  <li key={`${d.index}-${it}`}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PublicationSection>

      {/* ── 03 Experience ────────────────────────────────────────────── */}
      <PublicationSection index="03" title="Experience">
        <ol className="pf-exp">
          {EXPERIENCE.map((e) => (
            <li key={e.title} className="pf-exp-row" data-reveal>
              <span className="t-label pf-exp-period">{e.period}</span>
              <div className="pf-exp-body">
                <h4 className="pf-exp-title">{e.title}</h4>
                <p className="t-meta pf-exp-place">{e.place}</p>
                <p className="pf-exp-text">{e.body}</p>
                <ul className="pf-exp-tags">
                  {e.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </PublicationSection>

      {/* ── 06 Engineering principles ────────────────────────────────── */}
      <PublicationSection index="06" title="Engineering Principles">
        <ol className="pf-principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="pf-principle" data-reveal>
              <span className="pf-principle-n" aria-hidden="true">
                {p.n}
              </span>
              <div>
                <h4 className="pf-principle-title">{p.title}</h4>
                <p className="pf-principle-body">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </PublicationSection>

      {/* ── Contents index for the publication ───────────────────────── */}
      <div className="pf-contents" data-reveal>
        <TopologyPlate className="pf-contents-plate" />
        <ol className="pf-contents-list">
          {RESUME_SECTIONS.map((s) => (
            <li key={s.index}>
              <a href={CONTENTS_TARGET[s.index]}>
                <span className="pf-contents-n">{s.index}</span>
                <span className="pf-contents-title">{s.title}</span>
                <span className="pf-contents-leader" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </Movement>
  );
}

/** A numbered movement inside the publication. The numeral is architecture. */
function PublicationSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pub" aria-labelledby={`pub-${index}`}>
      <header className="pub-head" data-reveal>
        <span className="t-numeral pub-index" aria-hidden="true">
          {index}
        </span>
        <h3 id={`pub-${index}`} className="pub-title">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}
