import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { CreditInvoiceDialog } from '@/components/domain/CreditInvoiceDialog';
import { InvoiceActions } from '@/components/domain/InvoiceActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/primitives/card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { formatCents } from '@/lib/invoicing/money';
import { createClient } from '@/lib/supabase/server';

import { createCreditInvoice, markInvoicePaid, sendInvoice } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Factuur — ServOps' };

const STATUS_LABEL: Record<'draft' | 'sent' | 'paid', string> = {
  draft: 'Concept',
  sent: 'Verzonden',
  paid: 'Betaald',
};

/**
 * Factuur-detail — FR-068 AC4/5: toont, als er gekoppelde creditfacturen
 * bestaan, "Correctie via creditfactuur #X op [datum]" + het saldo
 * (origineel totaal + som van credit-totalen, die zelf al negatief zijn).
 */
export default async function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers(name)')
    .eq('id', id)
    .maybeSingle();

  if (!invoice) {
    notFound();
  }

  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', id)
    .order('sequence');

  const { data: creditNotes } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, total_amount_cents, status')
    .eq('parent_invoice_id', id)
    .order('invoice_date', { ascending: true });

  const { data: parentInvoice } = invoice.parent_invoice_id
    ? await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('id', invoice.parent_invoice_id)
        .maybeSingle()
    : { data: null };

  const customer = invoice.customers as { name: string } | null;
  const saldoCents =
    invoice.total_amount_cents +
    (creditNotes ?? []).reduce((sum, cn) => sum + cn.total_amount_cents, 0);

  const creditableLines = (lines ?? [])
    .filter((line) => line.total_amount_cents > 0)
    .map((line) => ({
      id: line.id,
      description: line.description,
      exclVatAmountCents: Math.round(Number(line.quantity) * line.unit_price_cents),
      vatRate: Number(line.vat_rate),
      totalAmountCents: line.total_amount_cents,
    }));

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number ?? 'Conceptfactuur'}
        description={customer?.name}
        action={
          <div className="flex gap-2">
            <InvoiceActions
              status={invoice.status}
              onSend={sendInvoice.bind(null, invoice.id)}
              onMarkPaid={markInvoicePaid.bind(null, invoice.id)}
            />
            {invoice.status !== 'draft' && !invoice.parent_invoice_id ? (
              <CreditInvoiceDialog
                lines={creditableLines}
                onSubmit={createCreditInvoice.bind(null, invoice.id)}
              />
            ) : null}
          </div>
        }
      />

      {parentInvoice ? (
        <Card className="border-warning mb-4">
          <CardContent>
            <p className="text-text text-sm">
              Dit is een creditfactuur voor{' '}
              <Link href={`/facturen/${parentInvoice.id}`} className="underline">
                factuur {parentInvoice.invoice_number ?? parentInvoice.id}
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}

      {creditNotes && creditNotes.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="space-y-1 pt-6">
            {creditNotes.map((cn) => (
              <p key={cn.id} className="text-text text-sm">
                Correctie via{' '}
                <Link href={`/facturen/${cn.id}`} className="underline">
                  creditfactuur {cn.invoice_number ?? cn.id}
                </Link>{' '}
                op {cn.invoice_date} ({formatCents(cn.total_amount_cents)})
              </p>
            ))}
            <p className="text-text pt-2 text-sm font-medium">Saldo: {formatCents(saldoCents)}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle level="h2">Factuurgegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Status: {STATUS_LABEL[invoice.status]}</p>
          <p>Factuurdatum: {invoice.invoice_date}</p>
          <p>Vervaldatum: {invoice.due_date}</p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle level="h2">Regels</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted">
              <tr>
                <th className="py-2 font-medium">Omschrijving</th>
                <th className="py-2 font-medium">Aantal</th>
                <th className="py-2 font-medium">Prijs</th>
                <th className="py-2 font-medium">BTW</th>
                <th className="py-2 font-medium">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((line) => (
                <tr key={line.id} className="border-border border-t">
                  <td className="py-2">{line.description}</td>
                  <td className="py-2">{Number(line.quantity)}</td>
                  <td className="py-2">{formatCents(line.unit_price_cents)}</td>
                  <td className="py-2">{Number(line.vat_rate)}%</td>
                  <td className="py-2">{formatCents(line.total_amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-text mt-4 text-right text-sm font-semibold">
            Totaal: {formatCents(invoice.total_amount_cents)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
