/**
 * Transactionele e-mail (16_Facturatie.md § 6, FR-064-email) via de Resend
 * REST API — geen SDK-afhankelijkheid nodig voor één endpoint (`fetch`
 * volstaat, 41_CodingStandards.md § 1: geen dependency zonder concrete
 * meerwaarde). `RESEND_API_KEY` ontbreekt lokaal per ontwerp (net als
 * `MAPBOX_ACCESS_TOKEN`, PRD § 19 A-13) — de aanroeper geeft dan een
 * `config_error` terug i.p.v. te doen alsof de e-mail verzonden is.
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: Uint8Array };
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: 'config_error' };
  }

  const body: Record<string, unknown> = {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  };

  if (params.attachment) {
    body.attachments = [
      {
        filename: params.attachment.filename,
        content: Buffer.from(params.attachment.content).toString('base64'),
      },
    ];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, error: `resend_http_${res.status}` };
  }

  return { ok: true };
}
