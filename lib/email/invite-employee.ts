import { sendEmail, type SendEmailResult } from '@/lib/email/resend';

/**
 * Medewerker-uitnodigingsmail (22_Authenticatie.md § 8, FR-103) — apart van
 * Supabase's eigen bevestigingsmail die ná het instellen van een wachtwoord
 * nog volgt (auth.email.enable_confirmations=true, supabase/config.toml):
 * deze mail bevat de link naar /uitnodiging/[token], niet een auth-code.
 */
export async function sendEmployeeInviteEmail(params: {
  to: string;
  companyName: string;
  inviteUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Je bent uitgenodigd bij ${params.companyName} op ServOps`,
    html: `
      <p>Hoi,</p>
      <p>Je bent uitgenodigd om als medewerker aan de slag te gaan bij <strong>${params.companyName}</strong> op ServOps.</p>
      <p><a href="${params.inviteUrl}">Stel je wachtwoord in en activeer je account</a></p>
      <p>Deze link is 7 dagen geldig.</p>
      <p>Heb je deze uitnodiging niet verwacht? Dan kun je deze e-mail negeren.</p>
    `,
  });
}
