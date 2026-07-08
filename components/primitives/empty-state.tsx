import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — 26_ComponentLibrary.md § 2, 24_UI_UX.md § 4. Elke lege lijst legt uit
 * wat hier komt en biedt de eerste actie aan; nooit een kale "geen data".
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-text text-base font-medium">{title}</p>
      {description ? <p className="text-text-muted max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
