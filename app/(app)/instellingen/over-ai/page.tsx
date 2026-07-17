import { CheckCircle2, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/composed/PageHeader';
import { requireOnboardedUser } from '@/lib/auth/session';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hoe RouteFlow AI gebruikt — RouteFlow',
};

/**
 * AI-transparantiepagina — FR-903, EU AI Act Art. 4 (AI-geletterdheid) en
 * Art. 50(1) (transparantie bij AI-interactie), zie `47_AIAct_Compliance.md`
 * § 6.1/6.2. Statische, uitlegbare content — geen los datamodel, dus geen
 * migratie nodig; wijzigingen aan de inhoud volgen de wijzigingen aan de
 * onderliggende architectuur (ADR-014, 43_AI_Agents.md) en moeten met die
 * documenten in de pas blijven lopen.
 */
export default async function OverAiPage() {
  await requireOnboardedUser();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Hoe RouteFlow AI gebruikt"
        description="Een eerlijk overzicht: wat is er echt AI, wat noemen we AI maar is het niet, en wie beslist er uiteindelijk."
      />

      <section className="border-border bg-bg rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <span className="bg-surface text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <MessageSquareText aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-sm font-semibold">
              Het enige onderdeel dat écht een taalmodel gebruikt: de Command Bar
            </h2>
            <p className="text-text-muted mt-2 text-sm">
              Wanneer je in de zoekbalk (⌘K) een vrije zin typt — bijvoorbeeld &ldquo;wie kan er
              vandaag nog een klus bij hebben&rdquo; — stuurt RouteFlow die tekst naar Claude
              (Anthropic) om te bepalen welke van een vaste lijst acties je bedoelt. Dit is altijd
              expliciet gelabeld als &ldquo;Vraag AI&rdquo; in de zoekresultaten — je kiest er zelf
              voor.
            </p>
            <ul className="text-text-muted mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                Er gaat nooit klant- of bedrijfsdata mee in het verzoek — alleen de getypte zin.
              </li>
              <li>
                Het model kiest uitsluitend uit een vaste, vooraf bepaalde lijst acties — het
                genereert nooit zelf een antwoord en heeft geen toegang tot de database.
              </li>
              <li>Elk verzoek wordt gelogd (tokengebruik, geen inhoud) voor kostenbeheer.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-border bg-bg rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <span className="bg-surface text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-sm font-semibold">
              De &ldquo;AI Agents&rdquo; op je Vandaag-scherm zijn geen lerende AI
            </h2>
            <p className="text-text-muted mt-2 text-sm">
              Namen als Planning Agent, Weather Agent, Optimization Agent, Capacity Agent,
              Replanning Agent en Invoice Agent klinken als AI, maar het zijn vaste, programmeerbare
              rekenregels — dezelfde regel geeft altijd hetzelfde resultaat bij dezelfde gegevens.
              Ze &ldquo;leren&rdquo; niet en gebruiken geen taalmodel. We noemen ze toch Agents
              omdat ze zelfstandig een voorstel voorbereiden, niet omdat er een black box achter
              zit.
            </p>
            <p className="text-text-muted mt-2 text-sm">
              Waarom dit ertoe doet: het onderscheid tussen &ldquo;regels die we hebben
              geprogrammeerd&rdquo; en &ldquo;een model dat zelf besluit&rdquo; is precies waar de
              Europese AI-verordening om draait. Bij RouteFlow is bijna alles het eerste.
            </p>
          </div>
        </div>
      </section>

      <section className="border-border bg-bg rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <span className="bg-surface text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <ShieldCheck aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-sm font-semibold">Jij beslist, altijd</h2>
            <p className="text-text-muted mt-2 text-sm">
              Geen enkel voorstel — van een Agent of van de Command Bar-AI — wordt automatisch
              uitgevoerd. Elk voorstel op je Vandaag-scherm toont waarom het is gedaan, hoe zeker
              het systeem ervan is, en welke alternatieven zijn overwogen. Pas als jij op
              &ldquo;Accepteren&rdquo; klikt, gebeurt er iets in de planning.
            </p>
          </div>
        </div>
      </section>

      <section className="border-border bg-bg rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <span className="bg-surface text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-sm font-semibold">Wat AI bij RouteFlow nooit doet</h2>
            <ul className="text-text-muted mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                Nooit automatisch facturen versturen, betalingen uitvoeren of prijzen wijzigen.
              </li>
              <li>Nooit medewerkers beoordelen op prestaties of gedrag.</li>
              <li>
                Beurten worden nooit toegewezen op basis van iemands gedrag of persoonlijke
                kenmerken — alleen op beschikbaarheid, locatie, werktijd en bevoegdheden.
              </li>
              <li>Nooit een klant of medewerker verwijderen zonder jouw handeling.</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="text-text-muted text-xs">
        Dit overzicht is bedoeld als heldere uitleg, geen juridisch document. De volledige
        classificatie onder de EU AI Act staat vastgelegd in de projectdocumentatie.
      </p>
    </div>
  );
}
