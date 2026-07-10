import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Vult een `:id`-placeholder in een redirect-pad in. Domeinformulieren geven een
 * plain string mee i.p.v. een callback-functie: Server Components mogen geen
 * losse closures als prop doorgeven aan Client Components (alleen Server
 * Actions zijn over die grens serialiseerbaar) — zie CustomerForm.tsx e.a.
 */
export function resolveRedirectPath(template: string, createdId: string | null): string {
  return createdId ? template.replace(':id', createdId) : template;
}
