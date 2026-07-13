import { describe, expect, it } from 'vitest';

import { analyzeCapacity } from './capacity';

describe('analyzeCapacity (43_AI_Agents.md §9, Capacity Agent)', () => {
  it('genereert geen kandidaat op een rustige dag', () => {
    const result = analyzeCapacity({
      days: [{ date: '2026-07-14', jobCount: 8, availableEmployees: 3 }],
      averageJobsPerEmployeePerDay: 6,
    });
    expect(result).toEqual([]);
  });

  it('signaleert een dag zonder beurten niet, ook zonder beschikbare medewerkers', () => {
    const result = analyzeCapacity({
      days: [{ date: '2026-07-14', jobCount: 0, availableEmployees: 0 }],
      averageJobsPerEmployeePerDay: 6,
    });
    expect(result).toEqual([]);
  });

  it('signaleert "urgent" wanneer er beurten staan maar geen medewerker beschikbaar is', () => {
    const result = analyzeCapacity({
      days: [{ date: '2026-07-16', jobCount: 5, availableEmployees: 0 }],
      averageJobsPerEmployeePerDay: 6,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.candidate.severity).toBe('urgent');
    expect(result[0]!.candidate.confidence).toBeGreaterThan(0.9);
  });

  it('koppelt elke kandidaat aan zíjn eigen dag, niet aan de eerste/laatste dag van de reeks', () => {
    const result = analyzeCapacity({
      days: [
        { date: '2026-07-14', jobCount: 2, availableEmployees: 3 }, // rustig, geen kandidaat
        { date: '2026-07-15', jobCount: 25, availableEmployees: 3 }, // overbelast
        { date: '2026-07-16', jobCount: 3, availableEmployees: 3 }, // rustig, geen kandidaat
      ],
      averageJobsPerEmployeePerDay: 6,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.date).toBe('2026-07-15');
  });

  it('signaleert "attention" bij een lichte overschrijding en "urgent" bij een grote', () => {
    const light = analyzeCapacity({
      days: [{ date: '2026-07-16', jobCount: 19, availableEmployees: 3 }], // capaciteit 18, ratio 1.06
      averageJobsPerEmployeePerDay: 6,
    });
    expect(light[0]!.candidate.severity).toBe('attention');

    const heavy = analyzeCapacity({
      days: [{ date: '2026-07-17', jobCount: 25, availableEmployees: 3 }], // capaciteit 18, ratio 1.39
      averageJobsPerEmployeePerDay: 6,
    });
    expect(heavy[0]!.candidate.severity).toBe('urgent');
  });

  it('vult het volledige BR-703-explainability-schema in voor elke kandidaat', () => {
    const [result] = analyzeCapacity({
      days: [{ date: '2026-07-16', jobCount: 25, availableEmployees: 3 }],
      averageJobsPerEmployeePerDay: 6,
    });
    expect(result!.candidate.reasoning).not.toBe('');
    expect(result!.candidate.dataSources.length).toBeGreaterThan(0);
    expect(result!.candidate.businessRules.length).toBeGreaterThan(0);
    expect(result!.candidate.alternatives).not.toBe('');
    expect(result!.candidate.payload).toBeNull();
  });
});
