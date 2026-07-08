import Link from 'next/link';

import { Button } from '@/components/primitives/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-text text-lg font-medium">Pagina niet gevonden.</p>
      <p className="text-text-muted max-w-sm text-sm">
        Deze pagina bestaat niet (meer) of je hebt er geen toegang toe.
      </p>
      <Button asChild>
        <Link href="/">Naar het dashboard</Link>
      </Button>
    </div>
  );
}
