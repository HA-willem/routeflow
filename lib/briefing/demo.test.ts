import { describe, expect, it } from 'vitest';

import { buildDemoProposals, buildDemoSummary, buildDemoWeather } from './demo';

import type { DemoDayFacts } from './demo';

const FACTS: DemoDayFacts = {
  dateIso: '2026-07-13',
  jobsToday: 12,
  queueSize: 4,
  employeesAvailable: 3,
  routes: [
    { routeId: 'r1', employeeFirstName: 'Jan', jobCount: 6 },
    { routeId: 'r2', employeeFirstName: 'Rick', jobCount: 3 },
  ],
};

describe('buildDemoWeather (voorbeeldweergave, lib/briefing/demo.ts)', () => {
  it('is deterministisch per datum — geen flikkerende briefing bij refresh', () => {
    expect(buildDemoWeather(FACTS)).toEqual(buildDemoWeather(FACTS));
  });

  it('dekt het volledige werkvenster met plausibele waarden', () => {
    const weather = buildDemoWeather(FACTS);
    expect(weather.hours.map((h) => h.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    for (const hour of weather.hours) {
      expect(hour.precipitationChance).toBeGreaterThanOrEqual(0);
      expect(hour.precipitationChance).toBeLessThanOrEqual(100);
    }
  });

  it('noemt in de kernregel hetzelfde beginuur als rainFromHour (één bron, desktop én PWA)', () => {
    // Meerdere datums proberen zodat zowel droge als natte dagen langskomen.
    for (let day = 1; day <= 14; day++) {
      const facts = { ...FACTS, dateIso: `2026-07-${String(day).padStart(2, '0')}` };
      const weather = buildDemoWeather(facts);
      if (weather.rainFromHour === null) {
        expect(weather.summaryLine).toContain('Droog');
        expect(weather.affectedJobs).toBe(0);
      } else {
        expect(weather.summaryLine).toContain(`Regen vanaf ${weather.rainFromHour}:00`);
      }
    }
  });
});

describe('buildDemoProposals (ADR-012 § 6-schema)', () => {
  const weather = buildDemoWeather(FACTS);
  const proposals = buildDemoProposals(FACTS, weather);

  it('houdt confidence binnen (0, 1] — intern 0–1, weergave ×100 (ADR-012 § 3)', () => {
    for (const proposal of proposals) {
      expect(proposal.confidence).toBeGreaterThan(0);
      expect(proposal.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('vult elk verplicht uitleg-veld (BR-703: why/gegevens/regels/alternatieven)', () => {
    expect(proposals.length).toBeGreaterThan(0);
    for (const proposal of proposals) {
      expect(proposal.reasoning).not.toBe('');
      expect(proposal.dataSources.length).toBeGreaterThan(0);
      expect(proposal.businessRules.length).toBeGreaterThan(0);
      expect(proposal.alternatives).not.toBe('');
    }
  });

  it('heeft unieke ids en stelt alleen een wachtrij-voorstel voor als de wachtrij gevuld is', () => {
    expect(new Set(proposals.map((p) => p.id)).size).toBe(proposals.length);
    const emptyQueue = buildDemoProposals({ ...FACTS, queueSize: 0 }, weather);
    expect(emptyQueue.some((p) => p.agent === 'planning')).toBe(false);
  });
});

describe('buildDemoSummary (44 § 4)', () => {
  it('opent met de aangeleverde begroeting en benoemt het aantal voorstellen', () => {
    const weather = buildDemoWeather(FACTS);
    const proposals = buildDemoProposals(FACTS, weather);
    const summary = buildDemoSummary('Goedemorgen Willem.', FACTS, weather, proposals);
    expect(summary.startsWith('Goedemorgen Willem.')).toBe(true);
    expect(summary).toContain('voorstel');
  });

  it('geeft de rustige-dag-variant zonder werk (scenario "geen planning")', () => {
    const facts = { ...FACTS, jobsToday: 0, queueSize: 0, routes: [] };
    const weather = buildDemoWeather(facts);
    const summary = buildDemoSummary('Goedemorgen Willem.', facts, weather, []);
    expect(summary).toContain('niets gepland');
  });
});
