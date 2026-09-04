/* GET /api/setup-check — is this deployment actually able to sell anything?
   Reports only whether each secret is present, never its value.            */

import { book, env, fileSources, json } from './_lib.js';

export default function handler(req, res) {
  const sources = fileSources();
  const mode = book.checkout?.mode || 'demo';

  // Only the editions that are on sale and have files to send need a source;
  // a hardcover is posted, and an unreleased edition is nobody's problem yet.
  const needed = [
    ...new Set(
      book.editions.filter((item) => item.available !== false).flatMap((item) => item.files || [])
    ),
  ];
  const missing = needed.filter((key) => !sources[key]);

  const has = {
    secretKey: Boolean(env('STRIPE_SECRET_KEY')),
    webhookSecret: Boolean(env('STRIPE_WEBHOOK_SECRET')),
    resendKey: Boolean(env('RESEND_API_KEY')),
    from: Boolean(env('MAIL_FROM')),
    downloadSecret: Boolean(env('DOWNLOAD_SECRET')),
    telegramToken: Boolean(env('TELEGRAM_BOT_TOKEN')),
    telegramChat: Boolean(env('TELEGRAM_CHAT_ID')),
  };

  // Optional, so never blocking — but half of a pair sends nothing at all,
  // silently, which is worth saying out loud.
  const halfConfigured = has.telegramToken !== has.telegramChat;

  // What would actually go wrong today, in the order somebody would hit it.
  const blocking = [];
  if (mode === 'stripe') {
    if (!has.secretKey) blocking.push('STRIPE_SECRET_KEY is not set — checkout cannot start.');
    if (!has.webhookSecret) blocking.push('STRIPE_WEBHOOK_SECRET is not set — paid orders will never be delivered.');
    if (!has.resendKey || !has.from) blocking.push('RESEND_API_KEY and MAIL_FROM must both be set — buyers get no email.');
    if (!has.downloadSecret) blocking.push('DOWNLOAD_SECRET is not set — download links cannot be signed.');
    if (missing.length) blocking.push(`BOOK_FILES has no source for: ${missing.join(', ')}.`);
  }

  json(res, 200, {
    checkoutMode: mode,
    sellable: mode !== 'stripe' || blocking.length === 0,
    blocking,
    stripe: {
      secretKey: has.secretKey,
      webhookSecret: has.webhookSecret,
      livemode: env('STRIPE_SECRET_KEY').startsWith('sk_live_') || null,
      adaptivePricing: env('STRIPE_ADAPTIVE_PRICING') === 'true',
    },
    email: { resendKey: has.resendKey, from: has.from },
    downloads: {
      secret: has.downloadSecret,
      filesDeclared: needed,
      filesConfigured: needed.filter((key) => Boolean(sources[key])),
      missing,
    },
    notifications: {
      telegram: has.telegramToken && has.telegramChat,
      warning: halfConfigured
        ? `Only ${has.telegramToken ? 'TELEGRAM_BOT_TOKEN' : 'TELEGRAM_CHAT_ID'} is set — both are needed, so no message is being sent.`
        : null,
    },
    wholesale: {
      // Absent key means /api/invoice refuses everything, which is the safe
      // default — it is off, not open.
      enabled: Boolean(env('WHOLESALE_API_KEY')),
      terms: book.wholesale || null,
    },
  });
}
