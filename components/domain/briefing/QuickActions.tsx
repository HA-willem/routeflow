import Link from 'next/link';

import { Button } from '@/components/primitives/button';

/**
 * Snelle acties (44 § 3.9) — de expliciete uitgang van de briefing voor wie
 * liever zelf verder werkt. Directe navigatie, geen tussenstap.
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/planning">Naar planner</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/planning/wachtrij">Herplan-wachtrij bekijken</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/klanten/nieuw">Nieuwe klant</Link>
      </Button>
    </div>
  );
}
