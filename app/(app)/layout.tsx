import { AppSidebar } from '@/components/composed/AppSidebar';
import { CommandBar } from '@/components/composed/CommandBar';
import { Button } from '@/components/primitives/button';
import { logout } from '@/lib/auth/actions';
import { requireOnboardedUser } from '@/lib/auth/session';

import { searchCustomersForCommand } from './command-actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboardedUser();

  return (
    <div className="flex">
      <AppSidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-border flex items-center justify-between gap-4 border-b px-8 py-4">
          <CommandBar role={profile.role} searchCustomersAction={searchCustomersForCommand} />
          <div className="flex items-center gap-4">
            <p className="text-text-muted hidden text-sm md:block">
              Ingelogd als {profile.full_name}
            </p>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Uitloggen
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
