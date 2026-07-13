import { CalendarCheck, ListTodo, Route, Users } from 'lucide-react';
import Link from 'next/link';

import type { DayOverview as DayOverviewData } from '@/lib/briefing/types';

import type { LucideIcon } from 'lucide-react';

interface OverviewItem {
  icon: LucideIcon;
  value: number;
  label: string;
  href: string;
}

/**
 * Dagoverzicht (44 § 3.2) — de feitelijke basis in één oogopslag; elk getal is
 * klikbaar en springt naar het relevante detailscherm.
 */
export function DayOverview({ overview }: { overview: DayOverviewData }) {
  const items: OverviewItem[] = [
    {
      icon: CalendarCheck,
      value: overview.jobsToday,
      label: overview.jobsToday === 1 ? 'beurt vandaag' : 'beurten vandaag',
      href: '/planning?view=dag',
    },
    {
      icon: Route,
      value: overview.routesToday,
      label: overview.routesToday === 1 ? 'actieve route' : 'actieve routes',
      href: '/planning?view=dag',
    },
    {
      icon: Users,
      value: overview.employeesAvailable,
      label:
        overview.employeesAvailable === 1 ? 'medewerker beschikbaar' : 'medewerkers beschikbaar',
      href: '/instellingen/medewerkers',
    },
    {
      icon: ListTodo,
      value: overview.queueSize,
      label: 'in de wachtrij',
      href: '/planning/wachtrij',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group border-border bg-bg hover:border-primary/40 flex items-center gap-3 rounded-lg border p-4 transition-colors duration-150"
        >
          <item.icon
            aria-hidden
            className="text-text-muted group-hover:text-primary size-5 shrink-0 transition-colors duration-150"
          />
          <span className="min-w-0">
            <span className="text-text block text-xl font-semibold tabular-nums">{item.value}</span>
            <span className="text-text-muted block truncate text-xs">{item.label}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
