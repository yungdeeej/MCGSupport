import { Resend } from 'resend';
import { env } from './env';
import { logger, hashPII } from './logger';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** for analytics / threading */
  tag?: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  if (!resend) {
    logger.warn(
      { to: hashPII(opts.to), subject: opts.subject },
      'Resend not configured; email dropped',
    );
    if (env.DEV_LOG_MAGIC_LINKS) {
      // eslint-disable-next-line no-console
      console.log('\n=== DEV EMAIL ===\n', opts.subject, '\n', opts.text, '\n=================\n');
    }
    return;
  }
  try {
    const res = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      tags: opts.tag ? [{ name: 'category', value: opts.tag }] : undefined,
    });
    logger.info({ id: res.data?.id, tag: opts.tag, to: hashPII(opts.to) }, 'email sent');
  } catch (err) {
    logger.error({ err, to: hashPII(opts.to) }, 'email send failed');
    throw err;
  }
}

export function renderMagicLinkEmail(args: { name?: string | null; url: string; expiresMin: number }) {
  const greeting = args.name ? `Hi ${args.name},` : 'Hi there,';
  const text = `${greeting}

Click the link below to sign in to the MCG Student Support Portal. This link works once and expires in ${args.expiresMin} minutes.

${args.url}

If you didn't request this, you can ignore it — no one can sign in without the link.

— MCG Support`;
  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;padding:32px;color:#1d2c3c">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;padding:32px">
    <div style="font-size:14px;color:#2c79a8;font-weight:600;letter-spacing:.04em;text-transform:uppercase">MCG Career College</div>
    <h1 style="font-size:22px;margin:8px 0 16px">Sign in to Student Support</h1>
    <p style="line-height:1.6">${greeting}</p>
    <p style="line-height:1.6">Use the button below to sign in. The link is single-use and expires in <strong>${args.expiresMin} minutes</strong>.</p>
    <p style="margin:24px 0">
      <a href="${args.url}" style="background:#fa991d;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">Sign in</a>
    </p>
    <p style="font-size:13px;color:#64748b;line-height:1.6">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all">${args.url}</span></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#94a3b8">Didn't request this email? You can safely ignore it. No one can sign in without clicking the link.</p>
  </div>
</body></html>`;
  return { text, html };
}

export function renderTicketReplyEmail(args: {
  studentName?: string | null;
  ticketNumber: string;
  ticketSubject: string;
  replyExcerpt: string;
  url: string;
}) {
  const greeting = args.studentName ? `Hi ${args.studentName},` : 'Hi there,';
  const text = `${greeting}

You have a new reply on ticket ${args.ticketNumber} (${args.ticketSubject}):

"${args.replyExcerpt}"

View the full conversation: ${args.url}

— MCG Support`;
  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;padding:32px;color:#1d2c3c">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;padding:32px">
    <div style="font-size:14px;color:#2c79a8;font-weight:600;letter-spacing:.04em;text-transform:uppercase">MCG Support · ${args.ticketNumber}</div>
    <h1 style="font-size:20px;margin:8px 0 16px">${args.ticketSubject}</h1>
    <p>${greeting}</p>
    <p>You have a new reply on this ticket:</p>
    <blockquote style="border-left:3px solid #fa991d;padding:8px 16px;color:#475569;background:#fff7ec;border-radius:4px">${args.replyExcerpt}</blockquote>
    <p style="margin:24px 0"><a href="${args.url}" style="background:#fa991d;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">View ticket</a></p>
    <p style="font-size:12px;color:#94a3b8">— MCG Support</p>
  </div>
</body></html>`;
  return { text, html };
}
