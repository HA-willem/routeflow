import { Button } from '@/components/primitives/button';
import { logout } from '@/lib/auth/actions';
import { requirePlatformAdmin } from '@/lib/platform-admin/guard';

/**
 * Platform Admin-shell (ADR-013 §1.2, 46_PlatformAdmin.md §1) — bewust een
 * eigen, losse routegroep buiten `(app)`: geen `AppSidebar`/`CommandBar` (die
 * zijn tenant-rolgebonden), geen `company_id`-context. `requirePlatformAdmin()`
 * is de enige toegangscontrole — los van `requireOnboardedUser()`.
 */
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-border bg-surface flex items-center justify-between gap-4 border-b px-8 py-4">
        <div>
          <p className="text-text text-sm font-semibold">Platform Admin</p>
          <p className="text-text-muted text-xs">
            Alleen zichtbaar voor de platform-eigenaar — ADR-013
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Uitloggen
          </Button>
        </form>
      </header>
      <main className="px-8 py-6">{children}</main>
    </div>
  );
}
