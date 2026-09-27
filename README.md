# PALMA — The Creator Honours

PALMA is a UK awards institution for the adult creator industry. It recognises achievement and keeps the permanent public record of it: nominations, judging, honours, and the PALMA Roll of Honour (PaROH).

PALMA is not a content platform, a social network, a subscription service or a marketplace. It hosts no creator work and brokers nothing.

> PALMA is not the event. PALMA is the record. The event is one expression of it.

---

## Quick start

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL and AUTH_SECRET in .env.local
npm run db:migrate
npm run dev
```

Required for a real run: `DATABASE_URL` and `AUTH_SECRET`. `DIRECT_URL` is required only where a pooled `DATABASE_URL` cannot run migrations. Mail, webhook, cron, age-assurance and portrait-storage settings are documented in `.env.example`.

Development fixtures, where they exist, are for local databases only. Production operators are invited individually from the admin surface. Never run a seed, fixture or shared-password setup against production.

## Scripts

| Script                        | What it does                                    |
| ----------------------------- | ----------------------------------------------- |
| `npm run dev`                 | Development server                              |
| `npm run build` / `npm start` | Production build and server                     |
| `npm run verify`              | No-Prisma guard, typecheck, lint and unit tests |
| `npm test`                    | Unit tests                                      |
| `npm run test:integration`    | Integration tests against PostgreSQL            |
| `npm run db:migrate`          | Apply SQL migrations from `supabase/migrations` |
| `npm run retention`           | Run the data-retention sweep by hand            |
| `npm run honours:check`       | Check honour signatures without changing them   |
| `npm run honours:reseal`      | Re-sign honours after an `AUTH_SECRET` rotation |
| `npm run grant-admin`         | Promote an existing account to administrator    |

## One source of truth

PostgreSQL, and nothing else. There is no fallback dataset and no in-memory mode behind the public read layer: a name on the site is there because it is in the database. `DATABASE_URL` is therefore required everywhere, including at build time, where public pages are generated from the record.

## Architecture

```text
src/
  app/            Routes: public record, role surfaces, verification, SEO files
  components/     Brand, design-system primitives and PALMA editorial components
  domain/         Pure institutional logic: calendar, stages, eligibility, judging
  lib/            Crypto, env validation, RBAC, entrances, SEO, formatting
  server/
    actions/      Server Actions, the only write path
    data/         Read layer over PostgreSQL
    email/        Mailbox templates and delivery
    services/     Honours, verification records, retention and system jobs
supabase/
  migrations/     Additive SQL migrations and the migration ledger
tests/            Unit tests; tests/integration needs PostgreSQL
```

The rule that shapes the layout: `domain/` never touches I/O. Eligibility, score aggregation, conflict handling and selection are pure functions, so the rules of the institution can be read, reasoned about and tested without a database.

## Audience nominates. PALMA judges.

Nomination and judging are deliberately separate. Many nominations may point at one candidacy, but nothing in the judging path reads the count: judges never see it, it is never published, and no ranking derives from it. Popularity brings a creator to PALMA's attention and stops there.

## Creator CRM

`/portal/crm` is the relationship desk: for every creator on the record, who at PALMA owns the relationship, its stage (prospect → contacted → in conversation → onboarding → active, plus dormant and do-not-contact), priority, tags, next follow-up, a touchpoint history and tasks. Moderators and administrators hold `crm:view` and `crm:manage`; nobody else does.

It lives in three tables added by `supabase/migrations/0004_creator_crm.sql` (`CreatorRelationship`, `CreatorTouchpoint`, `CreatorTask`), read and written through the same postgres.js layer as everything else. Two rules are enforced in code and tests (`src/domain/crm.ts`):

- **No contact details.** The desk records the _route_ to a creator (account email, platform message, representative), never an address. Summaries, tasks and tags that contain an email address or phone number are refused.
- **Nothing from judging.** No nomination count, candidacy or score is read.

`do_not_contact` blocks outbound touchpoints and follow-ups. An upheld objection sets it and deletes the touchpoints and tasks; deleting a record removes all three by cascade.

## Verification

Every honour has a permanent verification URL. The code is derived, the record is signed, and the signature is checked on request. Revocation never deletes: a revoked honour remains on the record marked revoked.

## Security

- Server-side authorisation for every privileged action from one permission matrix.
- Four role entrances: `/creator`, `/judge`, `/portal`, `/admin`.
- scrypt password hashing, hashed session tokens, CSRF and same-origin checks.
- Strict security headers, including CSP and frame denial.
- Durable rate limiting in PostgreSQL.
- Append-only audit log for privileged actions.
- No identity documents, biometrics, dates of birth or raw IP addresses stored.
- First-party error reporting lands at `/admin/errors`; it records no cookies, auth headers or request bodies.

See `docs/OPERATIONS.md` for running a season and `docs/LAUNCH.md` for launch readiness.
