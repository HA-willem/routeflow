import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  );
}

// Semantische heading i.p.v. de shadcn-standaard <div> (41_CodingStandards.md § 4,
// toegankelijkheid is geen aparte stap). <h1>: elke huidige pagina die Card
// gebruikt (login/registreren/wachtwoord-vergeten/onboarding) heeft géén ander
// heading-element, dus dit is de enige/primaire paginatitel — geen h3 die de
// documentoutline een niveau zou laten overslaan. Zodra een pagina met meerdere
// Cards (bv. een dashboard met KPI-kaarten) landt, moet CardTitle een `level`-
// prop krijgen; dat is een bewuste latere aanpassing, geen aanname nu.
function CardTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1 data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
