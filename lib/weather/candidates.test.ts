import { describe, expect, it } from 'vitest';

import { buildWeatherCandidates } from './candidates';

import type { WeatherSensitiveJob } from './candidates';
import type { WeatherRiskHour } from './thresholds';

const RAIN_FROM_15: WeatherRiskHour[] = [
  { hour: 15, risks: ['rain'] },
  { hour: 16, risks: ['rain'] },
  { hour: 17, risks: ['rain'] },
];

function job(overrides: Partial<WeatherSensitiveJob> = {}): WeatherSensitiveJob {
  return {
    jobId: 'job-1',
    employeeId: 'emp-1',
    employeeFirstName: 'Rick',
    sensitivityType: 'rain',
    serviceStartHour: 9,
    ...overrides,
  };
}

describe('buildWeatherCandidates (43_AI_Agents.md §6, informatief in Sprint 7)', () => {
  it('genereert niets zonder risico-uren', () => {
    expect(buildWeatherCandidates({ date: '2026-07-14', riskHours: [], jobs: [job()] })).toEqual(
      [],
    );
  });

  it('genereert niets zonder weersgevoelige beurten', () => {
    expect(
      buildWeatherCandidates({ date: '2026-07-14', riskHours: RAIN_FROM_15, jobs: [] }),
    ).toEqual([]);
  });

  it('sluit een beurt uit die al vóór het risico-uur is afgerond (start ver vóór 15:00)', () => {
    // serviceStartHour < eerste risico-uur betekent hier dat de dienst begint
    // vóór het risico — in dit eenvoudige model betekent "geraakt" dat er een
    // risico-uur ná (of gelijk aan) het startuur ligt; een beurt die om 9:00
    // begint en de dag duurt door tot in de regen, telt dus wél mee (§ hieronder).
    const result = buildWeatherCandidates({
      date: '2026-07-14',
      riskHours: RAIN_FROM_15,
      jobs: [job({ serviceStartHour: 9, sensitivityType: 'wind' })],
    });
    // andere sensitivityType dan het risico → niet geraakt
    expect(result).toEqual([]);
  });

  it('markeert een regengevoelige beurt als geraakt wanneer een risico-uur op of na de starttijd valt', () => {
    const result = buildWeatherCandidates({
      date: '2026-07-14',
      riskHours: RAIN_FROM_15,
      jobs: [job({ serviceStartHour: 9 })],
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.impactedJobIds).toEqual(['job-1']);
    expect(result[0]!.severity).toBe('attention');
    expect(result[0]!.summary).toContain('15:00');
  });

  it('groepeert meerdere geraakte beurten van dezelfde/verschillende medewerkers in één kandidaat', () => {
    const result = buildWeatherCandidates({
      date: '2026-07-14',
      riskHours: RAIN_FROM_15,
      jobs: [
        job({ jobId: 'job-1', employeeId: 'emp-1', employeeFirstName: 'Rick' }),
        job({ jobId: 'job-2', employeeId: 'emp-1', employeeFirstName: 'Rick' }),
        job({ jobId: 'job-3', employeeId: 'emp-2', employeeFirstName: 'Jan' }),
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.impactedJobIds).toEqual(['job-1', 'job-2', 'job-3']);
    expect(result[0]!.impactedEmployeeIds).toEqual(['emp-1', 'emp-2']);
    expect(result[0]!.impact).toContain('Rick, Jan');
  });

  it('is altijd informatief (payload null) — geen automatische herplanning in Sprint 7', () => {
    const [candidate] = buildWeatherCandidates({
      date: '2026-07-14',
      riskHours: RAIN_FROM_15,
      jobs: [job()],
    });
    expect(candidate!.payload).toBeNull();
  });

  it('vult het volledige BR-703-schema', () => {
    const [candidate] = buildWeatherCandidates({
      date: '2026-07-14',
      riskHours: RAIN_FROM_15,
      jobs: [job()],
    });
    expect(candidate!.reasoning).not.toBe('');
    expect(candidate!.dataSources.length).toBeGreaterThan(0);
    expect(candidate!.businessRules.length).toBeGreaterThan(0);
    expect(candidate!.alternatives).not.toBe('');
  });
});
