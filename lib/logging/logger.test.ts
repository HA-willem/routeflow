import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCorrelationId, logger } from './logger';

describe('logger (NFR-701, 41_CodingStandards.md § 11)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logt info als gestructureerde JSON via console.log', () => {
    logger.info('beurt afgerond', { jobId: 'abc' });
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string);
    expect(parsed).toMatchObject({ level: 'info', message: 'beurt afgerond', jobId: 'abc' });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('logt warn via console.warn', () => {
    logger.warn('fallback geactiveerd');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('logt error via console.error', () => {
    logger.error('onboarding mislukt', { code: '23505' });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createCorrelationId', () => {
  it('genereert unieke UUID-achtige strings', () => {
    const a = createCorrelationId();
    const b = createCorrelationId();
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
});
