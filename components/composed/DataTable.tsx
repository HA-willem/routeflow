import Link from 'next/link';

import { EmptyState } from '@/components/primitives/empty-state';

import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /**
   * Sla de `onRowHref`-link-wrap voor deze kolom over — nodig voor kolommen
   * die zelf al een interactief element bevatten (bv. een actielink), anders
   * ontstaat een ongeldige geneste `<a>` (WCAG "nested-interactive").
   */
  interactive?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowHref?: (row: T) => string;
}

/**
 * DataTable — 26_ComponentLibrary.md § 3. RSC-first (41_CodingStandards.md § 5):
 * de pagina haalt data server-side op en geeft `rows` mee; loading/error-staten
 * zijn hierom géén component-verantwoordelijkheid maar route-segment-staten
 * (`loading.tsx`/`error.tsx`, § 10). Empty/loaded worden hier wel afgehandeld.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowHref,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={`px-4 py-3 font-medium ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = onRowHref?.(row);
            return (
              <tr key={getRowKey(row)} className="border-border hover:bg-surface border-t">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-3 ${column.className ?? ''}`}>
                    {href && !column.interactive ? (
                      <Link href={href} className="block">
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
