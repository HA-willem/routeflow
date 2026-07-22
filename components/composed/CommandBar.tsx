'use client';

import { Command } from 'cmdk';
import {
  BarChart3,
  CalendarDays,
  FileText,
  ListTodo,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import type { CommandCustomerResult } from '@/lib/command/types';
import { visibleNavItems, type UserRole } from '@/lib/navigation';

import type { LucideIcon } from 'lucide-react';

const NAV_ICONS: Record<string, LucideIcon> = {
  '/': Sun,
  '/planning': CalendarDays,
  '/klanten': Users,
  '/facturen': FileText,
  '/dashboard': BarChart3,
  '/rapportage': BarChart3,
  '/instellingen': Settings,
};

export type AiCommandId =
  'plan_spoedklus' | 'wie_kan_bij' | 'verplaats_buitenwerk' | 'toon_beschikbaar';

interface EmployeeCapacity {
  firstName: string;
  remainingMinutes: number;
}

/**
 * AI-commando's (ADR-014). "wie_kan_bij"/"toon_beschikbaar" voeren een echte,
 * live capaciteitsquery uit; "plan_spoedklus"/"verplaats_buitenwerk" navigeren
 * naar het relevante scherm (geen bestaande actie om automatisch uit te voeren
 * zonder een specifieke beurt/medewerker te kiezen — geen kale simulatie).
 */
const AI_EXAMPLES: Array<{ id: AiCommandId; label: string; keywords: string[]; href: string }> = [
  {
    id: 'plan_spoedklus',
    label: 'Plan een spoedklus in',
    keywords: ['spoed', 'spoedklus', 'emergency', 'inplannen'],
    href: '/planning/wachtrij',
  },
  {
    id: 'wie_kan_bij',
    label: 'Wie kan er vandaag nog een beurt bij hebben?',
    keywords: ['wie', 'beschikbaar', 'capaciteit', 'vandaag'],
    href: '/planning?view=dag',
  },
  {
    id: 'verplaats_buitenwerk',
    label: 'Verplaats buitenwerk na 15:00',
    keywords: ['verplaats', 'buitenwerk', 'weer', 'regen'],
    href: '/planning',
  },
  {
    id: 'toon_beschikbaar',
    label: 'Toon beschikbare medewerkers',
    keywords: ['medewerkers', 'beschikbaar', 'team'],
    href: '/instellingen/medewerkers',
  },
];

function formatCapacityList(capacity: EmployeeCapacity[]): string {
  return capacity
    .map((c) => {
      const hours = Math.floor(c.remainingMinutes / 60);
      const minutes = c.remainingMinutes % 60;
      return `${c.firstName} (${hours}u${minutes ? ` ${minutes}m` : ''} vrij)`;
    })
    .join(', ');
}

interface CommandBarProps {
  role: UserRole;
  searchCustomersAction: (query: string) => Promise<CommandCustomerResult[]>;
  getCapacitySummaryAction: () => Promise<EmployeeCapacity[]>;
  /** ADR-014: routeert vrije tekst naar één van AI_EXAMPLES' id's, of `null` (geen goede match/geen key). */
  routeAiCommandAction: (text: string) => Promise<AiCommandId | null>;
}

/**
 * AI Command Bar (⌘K) — het snelle-toegangspunt van ServOps: navigatie,
 * acties en klantzoeken in één invoerveld, plus AI-voorbeeldcommando's die de
 * Sprint 7-agent-interface alvast laten zien (interface-only, met expliciete
 * voorbeeld-markering — er wordt geen AI gesuggereerd die er nog niet is).
 */
export function CommandBar({
  role,
  searchCustomersAction,
  getCapacitySummaryAction,
  routeAiCommandAction,
}: CommandBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CommandCustomerResult[]>([]);
  const [isRoutingAi, setIsRoutingAi] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Platform-specifiek sneltoetslabel (⌘K vs Ctrl K): server-snapshot toont ⌘K,
  // de client corrigeert direct na hydration — zonder mismatch of effect-setState.
  const isMac = useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  );
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Bij elk sluiten (esc/overlay/navigatie) de invoer wissen — heropenen
  // begint altijd met een schone balk, geen stale zoekterm.
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length < 2) {
        setCustomers([]);
        return;
      }
      startTransition(async () => {
        setCustomers(await searchCustomersAction(query));
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchCustomersAction]);

  const navigate = useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [handleOpenChange, router],
  );

  async function runAiExample(example: (typeof AI_EXAMPLES)[number]) {
    if (example.id === 'wie_kan_bij' || example.id === 'toon_beschikbaar') {
      const capacity = await getCapacitySummaryAction();
      if (capacity.length === 0) {
        toast('Geen medewerkers beschikbaar vandaag.');
      } else if (example.id === 'wie_kan_bij') {
        const withRoom = capacity.filter((c) => c.remainingMinutes > 0);
        toast(
          withRoom.length > 0
            ? `Ruimte bij: ${formatCapacityList(withRoom)}`
            : 'Niemand heeft vandaag nog ruimte.',
        );
      } else {
        toast(`Beschikbaar vandaag: ${capacity.map((c) => c.firstName).join(', ')}`);
      }
      navigate(example.href);
      return;
    }

    // plan_spoedklus/verplaats_buitenwerk: geen bestaande actie om automatisch uit
    // te voeren zonder een specifieke beurt/medewerker/tijd te kiezen — brengt je
    // naar het scherm waar dat handmatig kan, geen kale simulatie van een resultaat.
    navigate(example.href);
  }

  async function runFreeTextAiCommand(text: string) {
    setIsRoutingAi(true);
    try {
      const commandId = await routeAiCommandAction(text);
      const matched = AI_EXAMPLES.find((example) => example.id === commandId);
      if (!matched) {
        toast('Kon je verzoek niet herkennen — probeer een van de commando’s hieronder.');
        return;
      }
      await runAiExample(matched);
    } finally {
      setIsRoutingAi(false);
    }
  }

  const navItems = visibleNavItems(role);
  const trimmedQuery = query.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border text-text-muted hover:border-primary/40 hover:text-text flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-150 sm:w-64"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:block">Zoeken of commando…</span>
        <kbd className="bg-surface text-text-muted hidden rounded-sm px-1.5 py-0.5 font-sans text-xs sm:block">
          {shortcutLabel}
        </kbd>
        <span className="sr-only">Command bar openen</span>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-[15%] left-[50%] z-50 w-full max-w-xl translate-x-[-50%] duration-200 outline-none"
          >
            <DialogPrimitive.Title className="sr-only">
              Zoeken of commando uitvoeren
            </DialogPrimitive.Title>
            <Command
              label="Command bar"
              className="border-border bg-bg overflow-hidden rounded-lg border shadow-lg"
            >
              <div className="border-border flex items-center gap-3 border-b px-4">
                <Search aria-hidden className="text-text-muted size-4 shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Typ een commando of zoek een klant…"
                  className="text-text placeholder:text-text-muted h-12 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="text-text-muted px-3 py-8 text-center text-sm">
                  Geen resultaten voor “{query}”.
                </Command.Empty>

                {trimmedQuery.length >= 3 ? (
                  <Command.Group
                    heading="Vraag AI"
                    className="text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                  >
                    <Command.Item
                      value={`vraag-ai-${trimmedQuery}`}
                      disabled={isRoutingAi}
                      onSelect={() => runFreeTextAiCommand(trimmedQuery)}
                      className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                    >
                      <Sparkles aria-hidden className="text-primary size-4 shrink-0" />
                      <span className="flex-1">Vraag AI: “{trimmedQuery}”</span>
                      {isRoutingAi ? <span className="text-text-muted text-xs">Bezig…</span> : null}
                    </Command.Item>
                  </Command.Group>
                ) : null}

                <Command.Group
                  heading="AI-assistent"
                  className="text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                >
                  {AI_EXAMPLES.map((example) => (
                    <Command.Item
                      key={example.label}
                      value={example.label}
                      keywords={example.keywords}
                      onSelect={() => runAiExample(example)}
                      className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                    >
                      <Sparkles aria-hidden className="text-primary size-4 shrink-0" />
                      <span className="flex-1">{example.label}</span>
                      <span className="border-border text-text-muted rounded-full border border-dashed px-2 py-0.5 text-xs">
                        Voorbeeld
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {customers.length > 0 ? (
                  <Command.Group
                    heading="Klanten"
                    className="text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                  >
                    {customers.map((customer) => (
                      <Command.Item
                        key={customer.id}
                        value={`klant-${customer.name}-${customer.id}`}
                        onSelect={() => navigate(`/klanten/${customer.id}`)}
                        className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                      >
                        <Users aria-hidden className="text-text-muted size-4 shrink-0" />
                        <span className="flex-1">{customer.name}</span>
                        {customer.city ? (
                          <span className="text-text-muted text-xs">{customer.city}</span>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                <Command.Group
                  heading="Navigatie"
                  className="text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                >
                  {navItems.map((item) => {
                    const Icon = NAV_ICONS[item.href] ?? Search;
                    return (
                      <Command.Item
                        key={item.href}
                        value={`ga naar ${item.label}`}
                        onSelect={() => navigate(item.href)}
                        className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                      >
                        <Icon aria-hidden className="text-text-muted size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group
                  heading="Acties"
                  className="text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                >
                  <Command.Item
                    value="nieuwe klant toevoegen"
                    onSelect={() => navigate('/klanten/nieuw')}
                    className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                  >
                    <UserPlus aria-hidden className="text-text-muted size-4 shrink-0" />
                    <span>Nieuwe klant</span>
                  </Command.Item>
                  <Command.Item
                    value="herplan-wachtrij bekijken"
                    onSelect={() => navigate('/planning/wachtrij')}
                    className="data-[selected=true]:bg-surface text-text flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
                  >
                    <ListTodo aria-hidden className="text-text-muted size-4 shrink-0" />
                    <span>Herplan-wachtrij bekijken</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="border-border text-text-muted flex items-center gap-4 border-t px-4 py-2 text-xs">
                <span>
                  <kbd className="bg-surface rounded-sm px-1 py-0.5 font-sans">↑↓</kbd> navigeren
                </span>
                <span>
                  <kbd className="bg-surface rounded-sm px-1 py-0.5 font-sans">↵</kbd> openen
                </span>
                <span>
                  <kbd className="bg-surface rounded-sm px-1 py-0.5 font-sans">esc</kbd> sluiten
                </span>
              </div>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function subscribeNoop(): () => void {
  return () => {};
}
