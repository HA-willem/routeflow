import { describe, expect, it } from 'vitest';

import { visibleNavItems } from './navigation';

describe('visibleNavItems (30_Navigatie.md § 1)', () => {
  it('toont Eigenaar (owner) alle items', () => {
    const items = visibleNavItems('owner').map((item) => item.label);
    expect(items).toEqual([
      'Dashboard',
      'Planning',
      'Klanten',
      'Facturen',
      'Rapportage',
      'Instellingen',
    ]);
  });

  it('verbergt Rapportage en Instellingen voor Planner', () => {
    const items = visibleNavItems('planner').map((item) => item.label);
    expect(items).toEqual(['Dashboard', 'Planning', 'Klanten', 'Facturen']);
  });

  it('verbergt Planning voor Administratie', () => {
    const items = visibleNavItems('administration').map((item) => item.label);
    expect(items).toEqual(['Dashboard', 'Klanten', 'Facturen']);
  });

  it('toont geen enkel desktop-navigatie-item voor Medewerker (employee)', () => {
    // 29_MobieleApp.md: Medewerkers hebben geen desktop-dashboard, alleen de PWA.
    expect(visibleNavItems('employee')).toEqual([]);
  });
});
