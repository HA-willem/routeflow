import type { Database } from '@/types/database.types';

export type UserRole = Database['public']['Enums']['user_role'];

export interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

/**
 * Primaire navigatie — 30_Navigatie.md § 1 (canoniek, incl. rolzichtbaarheid).
 * Items waarvoor een rol geen toegang heeft worden verborgen, niet gedisabled (30 § 1).
 * `employee` staat hier bewust nergens in: Medewerkers hebben geen desktop-navigatie
 * (29_MobieleApp.md) — in Sprint 1 kan deze rol nog niet eens ontstaan (enige
 * schrijfpad naar users is onboard_company(), dat altijd role='owner' zet).
 */
export const NAV_ITEMS: NavItem[] = [
  // De Morning Briefing is het primaire startscherm (ADR-011 § 1, 44_MorningBriefing_UX.md);
  // het KPI-dashboard leeft sindsdien op /dashboard.
  { label: 'Vandaag', href: '/', roles: ['owner', 'admin', 'planner', 'administration'] },
  { label: 'Planning', href: '/planning', roles: ['owner', 'admin', 'planner'] },
  { label: 'Klanten', href: '/klanten', roles: ['owner', 'admin', 'planner', 'administration'] },
  { label: 'Facturen', href: '/facturen', roles: ['owner', 'admin', 'planner', 'administration'] },
  { label: 'Dashboard', href: '/dashboard', roles: ['owner', 'admin'] },
  { label: 'Rapportage', href: '/rapportage', roles: ['owner', 'admin'] },
  { label: 'Instellingen', href: '/instellingen', roles: ['owner', 'admin'] },
];

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
