import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUserMock, maybeSingleMock, fromMock, createClientMock, redirectMock } = vi.hoisted(
  () => {
    const maybeSingleMock = vi.fn();
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const getUserMock = vi.fn();
    const createClientMock = vi.fn(async () => ({
      auth: { getUser: getUserMock },
      from: fromMock,
    }));
    const redirectMock = vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    return { getUserMock, maybeSingleMock, fromMock, createClientMock, redirectMock };
  },
);

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const { getSessionContext, requireOnboardedUser, requireUser } = await import('./session');

const user = { id: 'user-1' } as never;
const profile = { id: 'user-1', company_id: 'company-1' } as never;

describe('getSessionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('geeft null als er geen ingelogde gebruiker is', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await getSessionContext();

    expect(result).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('geeft profile: null als de gebruiker nog niet onboarded is (FR-101)', async () => {
    getUserMock.mockResolvedValue({ data: { user } });
    maybeSingleMock.mockResolvedValue({ data: null });

    const result = await getSessionContext();

    expect(result).toEqual({ user, profile: null });
  });

  it('geeft user + profile voor een onboarded gebruiker', async () => {
    getUserMock.mockResolvedValue({ data: { user } });
    maybeSingleMock.mockResolvedValue({ data: profile });

    const result = await getSessionContext();

    expect(result).toEqual({ user, profile });
  });
});

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirect naar /login als er geen sessie is', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('geeft de sessie terug als de gebruiker is ingelogd', async () => {
    getUserMock.mockResolvedValue({ data: { user } });
    maybeSingleMock.mockResolvedValue({ data: null });

    const result = await requireUser();

    expect(result).toEqual({ user, profile: null });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe('requireOnboardedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirect naar /onboarding als de gebruiker nog geen Bedrijf heeft (FR-101)', async () => {
    getUserMock.mockResolvedValue({ data: { user } });
    maybeSingleMock.mockResolvedValue({ data: null });

    await expect(requireOnboardedUser()).rejects.toThrow('REDIRECT:/onboarding');
    expect(redirectMock).toHaveBeenCalledWith('/onboarding');
  });

  it('geeft de sessie met profile terug als de gebruiker onboarded is', async () => {
    getUserMock.mockResolvedValue({ data: { user } });
    maybeSingleMock.mockResolvedValue({ data: profile });

    const result = await requireOnboardedUser();

    expect(result).toEqual({ user, profile });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
