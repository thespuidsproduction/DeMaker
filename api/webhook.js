/* POST /api/webhook — Stripe calls this once the money has actually moved.

   This is the only place a book is ever delivered, so it has to be careful
   about three things Stripe guarantees it will get wrong at least once: the
   same purchase arriving twice, a session that is complete but not yet paid,
   and a failure that no amount of retrying will fix.                        */

import {
  book,
  countryName,
  dashboard,
  env,
  escapeHtml,
  findEdition,
  json,
  money,
  notify,
  rawBody,
  sendEmail,
  signDownload,
  stripe,
  verifyStripeSignature,
} from './_lib.js';

// Stripe signs the bytes it sent, so nothing may parse them first.
export const config = { api: { bodyParser: false } };

/** The two events that can mean "this book is paid for". */
const FULFILS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  const raw = await rawBody(req);
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'])) {
    return json(res, 400, { error: 'Bad signature' });
  }

  const event = JSON.parse(raw.toString('utf8'));
  if (!FULFILS.has(event.type)) return json(res, 200, { received: true, ignored: event.type });

  const session = event.data.object;

  // Finishing the form is not the same as the money arriving. A delayed payment
  // method completes the session while it is still unpaid, and Stripe follows up
  // later with async_payment_succeeded. Until then, nothing is sent.
  if (session.payment_status !== 'paid') {
    return json(res, 200, { received: true, pending: session.payment_status });
  }

  // Stripe retries until it gets a 2xx, and both events above can describe the
  // same purchase. The session itself carries the record that it has already
  // been delivered, so a retry reads that mark instead of sending a second copy.
  if (session.metadata?.fulfilled) {
    return json(res, 200, { received: true, duplicate: true });
  }

  const to = session.customer_details?.email || session.customer_email;
  const item = findEdition(session.metadata?.editionId);

  // Neither of these can be fixed by trying again, so they answer 200 and shout
  // in the log instead. A webhook that retries forever buries every event behind
  // it, and the buyer is no better off for the queue.
  if (!to) {
    console.error(`Paid session ${session.id} has no email address — deliver this one by hand.`);
    await notify(attention('This order carries no email address, so nothing could be sent.', session));
    return json(res, 200, { received: true, undeliverable: 'no-email' });
  }
  if (!item) {
    console.error(
      `Paid session ${session.id} names edition "${session.metadata?.editionId}", which no longer exists.`
    );
    await notify(
      attention(
        `Edition “${escapeHtml(session.metadata?.editionId)}” no longer exists, so nothing could be sent to ${escapeHtml(to)}.`,
        session
      )
    );
    return json(res, 200, { received: true, undeliverable: 'unknown-edition' });
  }

  try {
    const files = item.files || [];
    const origin = env(
      'SITE_URL',
      `https://${req.headers['x-forwarded-host'] || req.headers.host}`
    ).replace(/\/$/, '');

    const links = files.map((key) => ({
      key,
      label: book.fileLabels?.[key] || key,
      url: `${origin}/api/download?t=${encodeURIComponent(signDownload(key, session.id))}`,
    }));

    // A hardcover is going somewhere. Repeating the address back is the cheapest
    // way for a buyer to catch a typo while it can still be corrected.
    const shipping = session.collected_information?.shipping_details || session.shipping_details;

    await sendEmail({
      to,
      subject: links.length ? `Your copy of ${book.title}` : `Thank you — ${book.title}`,
      text: plainText(item, links, shipping),
      html: html(item, links, shipping),
    });

    // Marked after the email, so a crash can only ever cost a duplicate, never a
    // silent non-delivery. If this call is the thing that fails, the worst case
    // is that a retry sends the book twice — which is the right way round.
    await stripe(`checkout/sessions/${session.id}`, {
      metadata: { ...session.metadata, fulfilled: String(Math.floor(Date.now() / 1000)) },
    }).catch((error) => console.error(`could not mark ${session.id} delivered`, error));

    await notify(sold(item, session, shipping, links.length));

    return json(res, 200, { received: true, delivered: links.length });
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want: the buyer has paid
    // and must end up with their book even if the mail provider had a moment.
    console.error('delivery failed', error);
    await notify(
      attention(
        `${escapeHtml(item.label)} for ${escapeHtml(to)} could not be sent. Stripe will retry.\n<i>${escapeHtml(error.message || 'unknown error')}</i>`,
        session,
        'Delivery failed'
      )
    );
    return json(res, 500, { error: 'Delivery failed' });
  }
}

/** Where to look this up, as a link when we can make one and a code when not. */
function reference(session) {
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  return intent
    ? `<a href="${dashboard(`payments/${intent}`, session.livemode)}">Open in Stripe</a>`
    : `<code>${escapeHtml(session.id)}</code>`;
}

/**
 * What the shopkeeper actually needs to know about a sale.
 *
 * Note what is missing: the download links. Those are bearer tokens — anybody
 * holding one can fetch the file until it expires — and a chat log is a poor
 * place to leave credentials. The buyer has them; that is the point of them.
 */
function sold(item, session, shipping, delivered) {
  const quantity = Number(session.metadata?.quantity) || 1;
  const buyer = session.metadata?.buyer;
  const to = session.customer_details?.email || session.customer_email;
  const address = addressLines(shipping);

  const lines = [
    '<b>New order</b>',
    `${escapeHtml(item.label)}${quantity > 1 ? ` × ${quantity}` : ''} — <b>${money(session.amount_total, session.currency)}</b>`,
    '',
    '<b>Buyer</b>',
    ...[buyer, to].filter(Boolean).map(escapeHtml),
  ];

  // Set out the way it goes on a label, not run together with commas — this is
  // the thing somebody copies when they are packing the parcel.
  if (address.length) lines.push('', '<b>Ship to</b>', ...address.map(escapeHtml));

  if (delivered) lines.push('', `${delivered} file${delivered === 1 ? '' : 's'} emailed.`);

  lines.push('', reference(session));
  return lines.join('\n');
}

/** Something has gone wrong on an order that is already paid for. */
function attention(what, session, title = 'Order needs attention') {
  return [`⚠️ <b>${title}</b>`, what, '', reference(session)].join('\n');
}

/** A posting address the way it goes on a label — one line per line. */
function addressLines(shipping) {
  const address = shipping?.address;
  if (!address) return [];
  return [
    shipping.name,
    address.line1,
    address.line2,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(' '),
    countryName(address.country),
  ].filter(Boolean);
}

/** The same address run together, for a line of email copy. */
const addressLine = (shipping) => addressLines(shipping).join(', ');

function plainText(item, links, shipping) {
  const lines = [`Thank you for buying ${book.title}.`, '', `Edition: ${item?.label || 'your copy'}`, ''];

  if (links.length) {
    lines.push('Your download links (valid for 30 days):', '');
    links.forEach((link) => lines.push(`${link.label}: ${link.url}`));
  } else {
    lines.push('Your order is confirmed. A physical copy will be sent to you.');
  }

  const address = addressLine(shipping);
  if (address) lines.push('', `Posting to: ${address}`);

  lines.push('', `— ${book.imprint}`);
  return lines.join('\n');
}

function html(item, links, shipping) {
  const rows = links
    .map(
      (link) => `
        <tr><td style="padding:8px 0">
          <a href="${link.url}" style="color:#7D4047;font-weight:700;text-decoration:none">
            ${escape(link.label)} &rarr;
          </a>
        </td></tr>`
    )
    .join('');

  const address = addressLine(shipping);

  return `<!doctype html>
<html><body style="margin:0;background:#F1ECE6;font-family:ui-rounded,'Segoe UI',system-ui,sans-serif;color:#2E2E2E">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#DDD5CD;border-top:18px solid #7D4047;border-radius:4px">
        <tr><td style="padding:28px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#7D4047;font-weight:700">Checked out</p>
          <h1 style="margin:0 0 4px;font-size:24px;line-height:1.2">${escape(book.title)}</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#5c5c5c">${escape(item?.label || 'Your copy')}</p>
          ${
            links.length
              ? `<p style="margin:0 0 8px;font-size:14px">Here it is. These links work for 30 days — save the files somewhere safe.</p>
                 <table role="presentation">${rows}</table>`
              : `<p style="margin:0;font-size:14px">Your order is confirmed. A physical copy is on its way.</p>`
          }
          ${
            address
              ? `<p style="margin:20px 0 0;font-size:13px;color:#5c5c5c">Posting to<br><strong style="color:#2E2E2E">${escape(address)}</strong></p>`
              : ''
          }
          <p style="margin:24px 0 0;font-size:12px;color:#6b6b6b">— ${escape(book.imprint)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
