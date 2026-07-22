'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { visibleNavItems, type UserRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  role: UserRole;
}

/**
 * AppSidebar — persistente zijbalk (30_Navigatie.md § 1). Alleen items waartoe de
 * rol toegang heeft worden getoond; de actieve sectie is gemarkeerd (30 § 6).
 */
export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="border-border bg-bg flex h-screen w-56 shrink-0 flex-col gap-1 border-r px-3 py-6"
    >
      <div className="text-text px-2 pb-4 text-lg font-semibold">ServOps</div>
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-surface text-text'
                : 'text-text-muted hover:bg-surface hover:text-text',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
