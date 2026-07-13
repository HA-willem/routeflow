import type { AgentProposal, WeatherDay, WeatherHour } from './types';

/**
 * Voorbeeldcontent voor de AI-onderdelen van de Morning Briefing.
 *
 * De AI-agents zelf zijn Sprint 7-scope (40_Implementatieplan.md); dit bestand
 * bouwt uitsluitend de *interface*-content: deterministisch per datum (geen
 * flikkerende briefing bij refresh), afgeleid van échte dagfeiten (routes,
 * wachtrij, medewerkers) zodat de voorbeelden kloppen met wat de gebruiker
 * elders in de app ziet. De UI markeert dit expliciet als "Voorbeeldweergave"
 * (`MorningBriefing.aiPreview`) — er wordt geen verzonnen AI als echt
 * gepresenteerd (ADR-011-vertrouwensmodel).
 */

export interface DemoDayFacts {
  dateIso: string;
  jobsToday: number;
  queueSize: number;
  employeesAvailable: number;
  routes: Array<{ routeId: string; employeeFirstName: string; jobCount: number }>;
}

/** Deterministische hash (FNV-1a) zodat dezelfde datum dezelfde briefing geeft. */
function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededPick(seed: number, index: number, max: number): number {
  // Kleine LCG-stap per index — voldoende voor UI-voorbeeldvariatie.
  const value = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  return value % max;
}

const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/** Voorbeeldweer: rustige ochtend, kans op regen in de middag op sommige dagen. */
export function buildDemoWeather(facts: DemoDayFacts): WeatherDay {
  const seed = hashSeed(`weer:${facts.dateIso}`);
  const rainyDay = seededPick(seed, 0, 3) !== 0; // ~2 op 3 dagen middagregen
  const rainFrom = 13 + seededPick(seed, 1, 4); // 13:00–16:00
  const baseTemp = 14 + seededPick(seed, 2, 8); // 14–21 °C

  const hours: WeatherHour[] = WORK_HOURS.map((hour) => {
    const afternoonRamp = rainyDay && hour >= rainFrom;
    return {
      hour,
      precipitationChance: afternoonRamp
        ? Math.min(90, 55 + (hour - rainFrom) * 12 + seededPick(seed, hour, 8))
        : 5 + seededPick(seed, hour + 20, 12),
      temperature: baseTemp + Math.round(3 * Math.sin(((hour - 8) / 9) * Math.PI)),
      windBft: 2 + seededPick(seed, hour + 40, 3),
    };
  });

  const affectedJobs = rainyDay ? Math.min(facts.jobsToday, 2 + seededPick(seed, 3, 3)) : 0;
  const minTemp = Math.min(...hours.map((h) => h.temperature));
  const maxTemp = Math.max(...hours.map((h) => h.temperature));
  const maxWindBft = Math.max(...hours.map((h) => h.windBft));

  return {
    summaryLine:
      rainyDay && affectedJobs > 0
        ? `Regen vanaf ${rainFrom}:00 — ${affectedJobs} ${affectedJobs === 1 ? 'beurt' : 'beurten'} geraakt.`
        : rainyDay
          ? `Regen vanaf ${rainFrom}:00 — geen weersgevoelige diensten geraakt.`
          : 'Droog en rustig weer — geen impact op de planning.',
    minTemp,
    maxTemp,
    maxWindBft,
    hours,
    affectedJobs,
    rainFromHour: rainyDay ? rainFrom : null,
  };
}

/**
 * Voorbeeldvoorstellen, gevoed door échte routes/wachtrij van vandaag.
 * Structuur volgt exact het ADR-012 § 6-schema (zie 44 § 5-voorbeeldtabel).
 */
export function buildDemoProposals(facts: DemoDayFacts, weather: WeatherDay): AgentProposal[] {
  const seed = hashSeed(`voorstellen:${facts.dateIso}`);
  const proposals: AgentProposal[] = [];

  const busiestRoute = [...facts.routes].sort((a, b) => b.jobCount - a.jobCount)[0];

  if (busiestRoute && busiestRoute.jobCount >= 3) {
    const savedMinutes = 8 + seededPick(seed, 1, 18);
    proposals.push({
      id: `demo-optimize-${facts.dateIso}`,
      agent: 'optimization',
      title: `Route van ${busiestRoute.employeeFirstName} herschikken`,
      summary: `${busiestRoute.jobCount} beurten in een andere volgorde rijden — dezelfde beurten, minder reistijd.`,
      reasoning: `De huidige volgorde kruist twee keer dezelfde wijk. Een herschikking bespaart ${savedMinutes} minuten rijden zonder dat er iets verschuift voor je klanten.`,
      dataSources: ['Reistijd-cache (distance_cache), bijgewerkt gisteren', 'Routes van vandaag'],
      businessRules: [
        { code: 'BR-101', label: 'Flexvenster gerespecteerd' },
        { code: 'BR-202', label: 'Werkdaglimiet (max. 8,5 uur)' },
      ],
      confidence: 0.86 + seededPick(seed, 2, 8) / 100,
      impact: `${busiestRoute.jobCount} beurten, 1 medewerker (${busiestRoute.employeeFirstName})`,
      expectedGain: `${savedMinutes} minuten minder reistijd, 0 klantwijzigingen`,
      alternatives:
        'Overwogen: beurten naar morgen verplaatsen — afgewezen, dat raakt klantafspraken terwijl herschikken volstaat.',
      severity: 'info',
    });
  }

  if (weather.affectedJobs > 0 && busiestRoute) {
    proposals.push({
      id: `demo-weather-${facts.dateIso}`,
      agent: 'weather',
      title: `Middagbeurten van ${busiestRoute.employeeFirstName} naar de ochtend`,
      summary: `${weather.affectedJobs} weersgevoelige ${weather.affectedJobs === 1 ? 'beurt' : 'beurten'} vóór de regen uitvoeren.`,
      reasoning: `${weather.summaryLine.replace(' — ', ' (')}) De geraakte diensten zijn weersgevoelig; in de ochtend blijft het droog.`,
      dataSources: ['KNMI-weerdata (voorbeeld), opgehaald 06:03', 'Weersgevoeligheid per dienst'],
      businessRules: [
        { code: 'BR-101', label: 'Flexvenster gerespecteerd' },
        { code: 'AI-6.3', label: 'Regendrempel (≥70% of ≥2 mm/u)' },
      ],
      confidence: 0.8 + seededPick(seed, 3, 10) / 100,
      impact: `${weather.affectedJobs} beurten, 1 medewerker (${busiestRoute.employeeFirstName})`,
      expectedGain: 'Voorkomt uitstel of een klacht bij weersgevoelige diensten',
      alternatives:
        'Overwogen: verplaatsen naar morgen — afgewezen, de ochtend van vandaag heeft nog ruimte binnen het flexvenster.',
      severity: 'attention',
    });
  }

  if (facts.queueSize > 0) {
    proposals.push({
      id: `demo-queue-${facts.dateIso}`,
      agent: 'planning',
      title: `${facts.queueSize} ${facts.queueSize === 1 ? 'beurt' : 'beurten'} uit de wachtrij inplannen`,
      summary: 'Open plekken in de routes van deze week benutten voor wachtrij-beurten.',
      reasoning:
        'Er staan beurten zonder route terwijl er deze week nog ruimte is binnen de werkdaglimiet van je medewerkers.',
      dataSources: ['Herplan-wachtrij (live)', 'Capaciteit per medewerker deze week'],
      businessRules: [
        { code: 'BR-202', label: 'Werkdaglimiet (max. 8,5 uur)' },
        { code: 'BR-101', label: 'Flexvenster gerespecteerd' },
      ],
      confidence: 0.72 + seededPick(seed, 4, 10) / 100,
      impact: `${facts.queueSize} ${facts.queueSize === 1 ? 'beurt' : 'beurten'}, meerdere routes`,
      expectedGain: 'Lege wachtrij, geen doorgeschoven werk naar volgende week',
      alternatives:
        'Overwogen: alles naar één dag schuiven — afgewezen, dat overschrijdt de werkdaglimiet (BR-202).',
      severity: facts.queueSize >= 5 ? 'attention' : 'info',
    });
  }

  return proposals;
}

/** AI Samenvatting — vaste opbouw, direct en persoonlijk (44 § 4). */
export function buildDemoSummary(
  greeting: string,
  facts: DemoDayFacts,
  weather: WeatherDay,
  proposals: AgentProposal[],
): string {
  if (facts.jobsToday === 0 && facts.queueSize === 0) {
    return `${greeting} Ik heb vannacht alles gecontroleerd — er staat vandaag niets gepland. Een rustige dag, of een goed moment om de week vooruit te plannen.`;
  }

  if (proposals.length === 0) {
    return `${greeting} Ik heb vannacht de planning gecontroleerd — geen wijzigingen nodig. Alle ${facts.jobsToday} beurten staan gepland, ${facts.employeesAvailable} ${facts.employeesAvailable === 1 ? 'medewerker is' : 'medewerkers zijn'} beschikbaar, en het weer werkt vandaag mee. Fijne dag.`;
  }

  const parts = [
    `${greeting} Ik heb vannacht de planning gecontroleerd en ${proposals.length === 1 ? 'één voorstel' : `${proposals.length} voorstellen`} klaargezet.`,
  ];
  const optimization = proposals.find((p) => p.agent === 'optimization');
  if (optimization) {
    const minutes = optimization.expectedGain.match(/^(\d+) minuten/)?.[1];
    if (minutes) parts.push(`De grootste besparing bedraagt ${minutes} minuten.`);
  }
  if (weather.affectedJobs > 0) {
    parts.push(
      `Door ${weather.summaryLine.charAt(0).toLowerCase()}${weather.summaryLine.slice(1).replace(/ — .*$/, '')} adviseer ik de geraakte beurten naar de ochtend te verplaatsen.`,
    );
  }
  if (facts.queueSize > 0) {
    parts.push(
      `Verder ${facts.queueSize === 1 ? 'wacht er nog één beurt' : `wachten er nog ${facts.queueSize} beurten`} in de wachtrij.`,
    );
  }
  return parts.join(' ');
}
