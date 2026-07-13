import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { InvoiceActions } from '@/components/domain/InvoiceActions';
import { requireOnboardedUser } from '@/lib/auth/session';
import { formatCents } from '@/lib/invoicing/money';
import { createClient } from '@/lib/supabase/server';

import { markInvoicePaid, sendInvoice } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Facturen — RouteFlow' };

const STATUS_LABEL: Record<'draft' | 'sent' | 'paid', string> = {
  draft: 'Concept',
  sent: 'Verzonden',
  paid: 'Betaald',
};

/** Facturen — 16_Facturatie.md, 23_Gebruikersrollen.md § 2 (Eigenaar/Admin/Planner R, Admin/Administratie U). */
export default async function FacturenPage() {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, status, invoice_date, due_date, total_amount_cents, customers(name)',
    )
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Facturen" />
      <DataTable
        rows={invoices ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="Nog geen facturen."
        emptyDescription="Conceptfacturen verschijnen hier zodra een medewerker een beurt afrondt."
        columns={[
          { header: 'Nummer', cell: (row) => row.invoice_number ?? '—' },
          {
            header: 'Klant',
            cell: (row) => (row.customers as { name: string } | null)?.name ?? '—',
          },
          { header: 'Status', cell: (row) => STATUS_LABEL[row.status] },
          { header: 'Datum', cell: (row) => row.invoice_date },
          { header: 'Vervaldatum', cell: (row) => row.due_date },
          { header: 'Bedrag', cell: (row) => formatCents(row.total_amount_cents) },
          {
            header: '',
            // Gebonden Server Actions (serialiseerbaar) — een inline closure vanuit
            // deze Server Component crasht de hele pagina ("Event handlers cannot
            // be passed to Client Component props").
            cell: (row) => (
              <InvoiceActions
                status={row.status}
                onSend={sendInvoice.bind(null, row.id)}
                onMarkPaid={markInvoicePaid.bind(null, row.id)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
