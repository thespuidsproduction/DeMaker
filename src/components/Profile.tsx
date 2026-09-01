"use client";

import { SITE, PRINCIPLES } from "@/content/site";
import { Marginalia } from "@/lib/traces";
import { Movement } from "./Movement";
import { CornerLeaf, EngravedRule, BotanicalDiagram } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROFILE
 *
 * An editorial page, not a résumé. No stack list lives here — the toolbox and
 * the projects already carry that, and repeating it would be the exact wall of
 * vocabulary this site is built to avoid.
 *
 * No address, telephone number or email appears. Only the country.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Profile() {
  return (
    <Movement id="profile" index="§ 07" title="The Person" aside="briefly">
      <div className="pf-card glass glass-plate" data-reveal>
        <CornerLeaf className="pf-leaf" />

        <div className="pf-identity">
          <div className="pf-identity-main">
            <h3 className="pf-name">{SITE.name}</h3>
            <ul className="pf-roles">
              {SITE.roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="t-meta pf-where">{SITE.location}</p>
          </div>

          {/* The handwriting against the grid. */}
          <div className="pf-annotation" aria-label="Working motto">
            <BotanicalDiagram className="pf-botanical" />
            <p className="t-hand pf-hand">
              {SITE.signature[0]}
              <br />
              {SITE.signature[1]}
            </p>
            <span className="t-meta pf-hand-caption">marginalia, undated</span>
          </div>
        </div>

        <EngravedRule className="pf-rule" />

        <p className="t-body pf-bio">
          I work across the whole surface of a product: the interface someone
          touches, the API it speaks to, the schema underneath, the pipeline that
          ships it, and the agentic layer that lets software act rather than
          merely answer. Not three jobs. One system, and the seams between them
          are where products usually fail.
        </p>
      </div>

      <ol className="pf-principles" aria-label="Engineering principles">
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

      <Marginalia after={2} prefix="you opened" pick="random" className="pf-margin" />
    </Movement>
  );
}
