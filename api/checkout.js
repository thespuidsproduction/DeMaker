/* POST /api/checkout — start a Stripe Checkout session for one edition.

   Hosted Checkout, on purpose: it carries the card fields, the wallets, 3D
   Secure and every local payment method this account has switched on, and none
   of that becomes this repository's problem. What is this repository's problem
   is everything below — that the thing being sold exists, that it can be
   delivered, and that a retry cannot sell it twice.                          */

import {
  book,
  env,
  findEdition,
  idempotencyKey,
  isPhysical,
  json,
  minorUnits,
  sellable,
  stripe,
} from './_lib.js';

const CURRENCIES = new Set(['usd', 'gbp', 'eur']);
const MAX_COPIES = 13;

/** Where a hardcover can actually be posted. Override with SHIP_TO. */
const shippingCountries = () =>
  env('SHIP_TO', 'GB,IE,US,CA,AU,NZ,FR,DE,ES,IT,NL,BE,AT,PT,SE,DK,NO,FI,PL')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // Strict lookup: an id nobody recognises is a mistake worth reporting, not
    // a reason to sell somebody the default edition and hope they wanted it.
    const item = findEdition(body.editionId);
    if (!item) return json(res, 400, { error: 'Unknown edition' });

    // The portal greys these out, but the portal is not the security boundary —
    // anything at all can POST here. Nothing gets sold before it exists.
    if (!sellable(item)) {
      return json(res, 409, {
        error: item.availability?.note || `The ${item.label} is not ready yet.`,
      });
    }

    const quantity = Math.min(Math.max(Math.trunc(Number(body.quantity) || 1), 1), MAX_COPIES);
    const currency = CURRENCIES.has(String(body.currency).toLowerCase())
      ? String(body.currency).toLowerCase()
      : 'usd';

    // The origin is taken from the request, never from the caller's payload —
    // an attacker must not be able to point the success redirect elsewhere.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = env('SITE_URL', `${proto}://${host}`).replace(/\/$/, '');

    const physical = isPhysical(item);
    const description = `${book.title} — ${item.label}`;

    const session = await stripe(
      'checkout/sessions',
      {
        mode: 'payment',
        success_url: `${origin}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?purchase=cancelled#portal`,
        customer_email:
          typeof body.email === 'string' && body.email.includes('@') ? body.email : undefined,
        allow_promotion_codes: 'true',

        // A customer record is what lets a repeat buyer be recognised later,
        // and what the wholesale side of the shop invoices against.
        customer_creation: 'always',

        // Every buyer gets a real invoice, not only a card receipt — the same
        // document a bookshop gets, just paid up front instead of on terms.
        invoice_creation: {
          enabled: 'true',
          invoice_data: {
            description,
            footer: book.imprint,
            metadata: { editionId: item.id },
          },
        },

        // Nothing can be posted to an address nobody asked for. Only the
        // editions that put an object in a van collect one.
        ...(physical
          ? {
              shipping_address_collection: { allowed_countries: shippingCountries() },
              phone_number_collection: { enabled: 'true' },
            }
          : {}),

        // Adaptive Pricing lets Stripe present a converted local price. This
        // shop deliberately charges the same *number* in every currency, so it
        // stays off unless somebody turns it on and accepts the conversion.
        ...(env('STRIPE_ADAPTIVE_PRICING') === 'true'
          ? { adaptive_pricing: { enabled: 'true' } }
          : {}),

        // The webhook reads these back. Without them a paid session cannot be
        // matched to a book, and nobody gets sent anything.
        metadata: { editionId: item.id, quantity: String(quantity) },
        payment_intent_data: {
          description: `${description} ×${quantity}`,
          metadata: { editionId: item.id },
        },

        line_items: [
          {
            quantity,
            price_data: {
              currency,
              unit_amount: minorUnits(item.price),
              product_data: {
                name: description,
                description: item.tagline || undefined,
              },
            },
          },
        ],
      },
      // One key per attempt: a retry inside the helper replays the first
      // session rather than opening a second one, while a genuine second click
      // still gets a session of its own.
      { idempotencyKey: idempotencyKey() }
    );

    return json(res, 200, { url: session.url });
  } catch (error) {
    console.error('checkout failed', error);
    return json(res, 500, { error: error.message || 'Checkout could not be started' });
  }
}
