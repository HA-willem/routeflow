import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * PageHeader — 26_ComponentLibrary.md § 3. Titel + primaire actie + overflow.
 * Max. één primaire actie per scherm (24_UI_UX.md § 1.1).
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-text text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-text-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
