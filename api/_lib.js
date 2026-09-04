/* ═══════════════════════════════════════════════════════════════════════
   Shared helpers for the three serverless functions.

   Nothing here needs an SDK: Stripe and Resend are both plain HTTPS APIs,
   and a signed download link is a hash. Keeping it to fetch and node:crypto
   means no dependencies to keep current and very fast cold starts.
   ═══════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import { book, edition } from '../src/content/book.js';

export { book, edition };

/**
 * Strict lookup. `edition` deliberately falls back to the default edition,
 * which is right for the page — a stale link should still show a book — and
 * wrong for money: a typo in an id must never quietly sell somebody the
 * hardcover instead. Anything that takes payment uses this one.
 */
export const findEdition = (id) => book.editions.find((item) => item.id === id) || null;

/** Can this edition actually be delivered today? */
export const sellable = (item) => Boolean(item) && item.available !== false;

/** Does this edition arrive in a van? Then Stripe has to ask where to send it. */
export const isPhysical = (item) =>
  item?.physical ?? (item?.formats || []).some((format) => /hardcover|paperback|print/i.test(format));

/** A fresh key for one attempt, so an internal retry cannot double anything up. */
export const idempotencyKey = () => crypto.randomUUID();

export const env = (name, fallback = '') => process.env[name]?.trim() || fallback;

/** Minor units — 34 becomes 3400. None of the supported currencies are zero-decimal. */
export const minorUnits = (amount) => Math.round(Number(amount) * 100);

/** The private location of a purchasable file, kept in an environment variable. */
export function fileSources() {
  try {
    return JSON.parse(env('BOOK_FILES', '{}'));
  } catch {
    console.error('BOOK_FILES is not valid JSON.');
    return {};
  }
}

const b64url = (buffer) => Buffer.from(buffer).toString('base64url');

/**
 * A download link nobody can forge and nobody can use forever:
 * base64url(fileKey.expiry.reference).signature
 */
export function signDownload(fileKey, reference, days = 30) {
  const secret = env('DOWNLOAD_SECRET');
  if (!secret) throw new Error('DOWNLOAD_SECRET is not set');
  const expiry = Date.now() + days * 86400_000;
  const payload = `${fileKey}.${expiry}.${reference}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${b64url(payload)}.${signature}`;
}

/** Returns the file key, or null if the token is forged, altered or stale. */
export function verifyDownload(token) {
  const secret = env('DOWNLOAD_SECRET');
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null;

  const index = token.lastIndexOf('.');
  const payload = Buffer.from(token.slice(0, index), 'base64url').toString('utf8');
  const signature = token.slice(index + 1);

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const [fileKey, expiry] = payload.split('.');
  if (!fileKey || Number(expiry) < Date.now()) return null;
  return fileKey;
}

/** Read a request body without letting anything parse it first. */
export function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Stripe's REST API takes form encoding, including for nested fields. */
export function formEncode(object, prefix = '') {
  const params = new URLSearchParams();
  const walk = (value, key) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${key}[${i}]`));
    else if (typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, `${key}[${k}]`));
    else params.append(key, String(value));
  };
  Object.entries(object).forEach(([k, v]) => walk(v, prefix ? `${prefix}[${k}]` : k));
  return params;
}

/**
 * The API version this code was written and tested against. Pinning it means
 * Stripe can improve the API without changing the shape of a response beneath
 * a deployment nobody is watching. Move it deliberately, not by accident.
 */
export const STRIPE_API_VERSION = '2026-08-26.dahlia';

/** Worth another go: a lock, a rate limit, or Stripe having a moment. */
const RETRYABLE = new Set([409, 429, 500, 502, 503, 504]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One call to Stripe, with the two things a payment integration cannot do
 * without: an idempotency key, so a retry replays the first answer instead of
 * charging or invoicing anybody twice, and a retry loop, so a blip on the wire
 * does not become a buyer staring at an error page.
 */
export async function stripe(path, body, { method = 'POST', idempotencyKey, attempts = 3 } = {}) {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  const headers = {
    Authorization: `Bearer ${key}`,
    'Stripe-Version': STRIPE_API_VERSION,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let url = `https://api.stripe.com/v1/${path}`;
  const options = { method, headers };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = formEncode(body || {});
  } else if (body) {
    url += `?${formEncode(body)}`;
  }

  let failure;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt) await wait(200 * 2 ** attempt);

    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      failure = error; // the network gave out before Stripe ever saw this
      continue;
    }

    const data = await response.json();
    if (response.ok) return data;

    failure = new Error(data?.error?.message || `Stripe refused: ${response.status}`);
    if (!RETRYABLE.has(response.status)) throw failure;
  }
  throw failure;
}

/** Verify a Stripe webhook signature by hand. */
export function verifyStripeSignature(raw, header, tolerance = 300) {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret || !header) return false;

  const parts = Object.fromEntries(header.split(',').map((part) => part.split('=')));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${raw.toString('utf8')}`)
    .digest('hex');

  const a = Buffer.from(parts.v1 || '');
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function sendEmail({ to, subject, html, text }) {
  const key = env('RESEND_API_KEY');
  const from = env('MAIL_FROM');
  if (!key || !from) throw new Error('RESEND_API_KEY and MAIL_FROM must both be set');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) throw new Error(`Resend refused: ${response.status} ${await response.text()}`);
  return response.json();
}

export const json = (res, status, body) => {
  res.setHeader('content-type', 'application/json');
  res.status(status).send(JSON.stringify(body));
};
