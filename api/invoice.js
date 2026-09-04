/* POST /api/invoice — raise a wholesale invoice for a bookshop.

   The portal takes cards from readers. This takes purchase orders from shops
   that buy by the box and settle on terms, which is a different transaction
   with a different document at the end of it: a real Stripe invoice, with a
   number, a PDF, a due date and a hosted page the shop can pay from.

   It is deliberately not public. Creating an invoice is creating money owed,
   so a caller has to present the wholesale key, and an endpoint with no key
   configured refuses everything rather than quietly opening the ledger.      */

import crypto from 'node:crypto';
import {
  book,
  dashboard,
  env,
  escapeHtml,
  findEdition,
  json,
  minorUnits,
  money,
  notify,
  sellable,
  stripe,
} from './_lib.js';

const CURRENCIES = new Set(['usd', 'gbp', 'eur']);
const MAX_COPIES = 5000;

/** Constant-time, so the key cannot be guessed a character at a time. */
function authorised(req) {
  const expected = env('WHOLESALE_API_KEY');
  if (!expected) return false;

  const header = req.headers.authorization || '';
  const presented = (header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-wholesale-key'] || '').trim();
  if (!presented) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** A reference we can key idempotency off, whether or not the shop supplied one. */
const orderReference = (body) =>
  String(body.reference || body.poNumber || '')
    .trim()
    .slice(0, 60) || null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  if (!env('WHOLESALE_API_KEY')) {
    return json(res, 503, { error: 'Wholesale invoicing is not configured on this deployment.' });
  }
  if (!authorised(req)) return json(res, 401, { error: 'Not authorised' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const terms = book.wholesale || {};

    const item = findEdition(body.editionId);
    if (!item) return json(res, 400, { error: 'Unknown edition' });
    if (!sellable(item)) {
      return json(res, 409, { error: item.availability?.note || `The ${item.label} is not ready yet.` });
    }

    const email = String(body.email || '').trim();
    if (!email.includes('@')) return json(res, 400, { error: 'A billing email address is required' });

    const name = String(body.name || '').trim();
    if (!name) return json(res, 400, { error: 'A shop name is required' });

    const quantity = Math.trunc(Number(body.quantity) || 0);
    const minimum = terms.minimumCopies || 1;
    if (!Number.isFinite(quantity) || quantity < minimum || quantity > MAX_COPIES) {
      return json(res, 400, {
        error: `Wholesale orders run from ${minimum} to ${MAX_COPIES} copies. For fewer, the ordinary checkout is cheaper to run.`,
      });
    }

    const currency = CURRENCIES.has(String(body.currency || terms.currency).toLowerCase())
      ? String(body.currency || terms.currency).toLowerCase()
      : 'gbp';

    const reference = orderReference(body);
    const poNumber = String(body.poNumber || '').trim().slice(0, 140);
    const daysUntilDue = Math.min(Math.max(Math.trunc(Number(body.daysUntilDue) || terms.termsDays || 30), 1), 180);

    // The trade price. Computed here rather than accepted from the caller —
    // a discount is the publisher's to set, not the buyer's to send.
    const discount = Math.min(Math.max(Number(terms.discount) || 0, 0), 0.9);
    const unitAmount = minorUnits(item.price * (1 - discount));

    // Every write below is keyed off the order reference where there is one, so
    // a shop that submits the same purchase order twice — or a proxy that
    // retries — ends up with one invoice rather than two.
    const key = (step) => (reference ? `wholesale-${reference}-${step}` : undefined);

    /* ── the shop ──────────────────────────────────────────────────────── */

    const existing = await stripe('customers', { email, limit: 1 }, { method: 'GET' });
    const customer =
      existing.data?.[0] ||
      (await stripe(
        'customers',
        {
          email,
          name,
          description: `Wholesale account — ${name}`,
          metadata: { kind: 'wholesale' },
        },
        { idempotencyKey: key('customer') }
      ));

    /* ── the invoice ───────────────────────────────────────────────────── */

    const invoice = await stripe(
      'invoices',
      {
        customer: customer.id,
        currency,
        collection_method: 'send_invoice',
        days_until_due: daysUntilDue,
        // Nothing is sent until the line item is on it and we say so.
        auto_advance: 'false',
        description: `Wholesale order — ${book.title} (${item.label})`,
        footer: book.imprint,
        // Metadata is the integration layer: it reaches webhooks, the API and
        // Sigma, which is where this order gets reconciled against the ledger.
        metadata: {
          kind: 'wholesale',
          editionId: item.id,
          quantity: String(quantity),
          ...(reference ? { orderRef: reference } : {}),
          ...(poNumber ? { poNumber } : {}),
        },
        // Custom fields are the opposite: they are the bit a shop's accounts
        // payable team actually needs to see printed on the PDF.
        ...(poNumber ? { custom_fields: [{ name: 'PO number', value: poNumber }] } : {}),
      },
      { idempotencyKey: key('invoice') }
    );

    await stripe(
      'invoiceitems',
      {
        customer: customer.id,
        invoice: invoice.id,
        currency,
        unit_amount_decimal: String(unitAmount),
        quantity,
        description: `${book.title} — ${item.label} (trade, ${Math.round(discount * 100)}% off cover)`,
      },
      { idempotencyKey: key('item') }
    );

    // A draft can be looked over in the Dashboard before it goes anywhere.
    if (body.draft === true) {
      return json(res, 200, { id: invoice.id, status: 'draft', customer: customer.id });
    }

    const finalised = await stripe(`invoices/${invoice.id}/finalize`, {}, { idempotencyKey: key('finalize') });
    const sent = await stripe(`invoices/${invoice.id}/send`, {}, { idempotencyKey: key('send') });

    await notify(
      [
        '<b>Invoice sent</b>',
        `${escapeHtml(finalised.number)} — <b>${money(finalised.amount_due, finalised.currency)}</b>`,
        '',
        '<b>Customer</b>',
        escapeHtml(name),
        [
          `${quantity} × ${escapeHtml(item.label)}`,
          `net ${daysUntilDue}`,
          // Most purchase orders already say "PO" in the number itself.
          poNumber ? (/^po\b/i.test(poNumber) ? escapeHtml(poNumber) : `PO ${escapeHtml(poNumber)}`) : '',
        ]
          .filter(Boolean)
          .join(' · '),
        '',
        `<a href="${dashboard(`invoices/${finalised.id}`, finalised.livemode)}">Open in Stripe</a>`,
      ].join('\n')
    );

    return json(res, 200, {
      id: finalised.id,
      number: finalised.number,
      status: sent.status,
      currency: finalised.currency,
      amountDue: finalised.amount_due,
      dueDate: finalised.due_date,
      hostedInvoiceUrl: finalised.hosted_invoice_url,
      invoicePdf: finalised.invoice_pdf,
      customer: customer.id,
    });
  } catch (error) {
    console.error('wholesale invoice failed', error);
    return json(res, 500, { error: error.message || 'The invoice could not be raised' });
  }
}
