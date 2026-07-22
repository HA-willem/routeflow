/**
 * Branche-dienstensjablonen (FR-104, PRD § 5.2/§ 6.7 — sinds PRD v1.0 gepland,
 * nooit gebouwd tot Sprint 12). Statische seed-data, geen tabel: een import is
 * gewoon een reeks losse inserts in de al-bestaande `services`-tabel, net als
 * een handmatige Dienst-aanmaak (006_services.sql).
 *
 * Volgorde/lijst: 39_Toekomstvisie.md § 2 "Uitrolvolgorde op basis van
 * gelijkenis met glazenwassers". Glazenwassers is het volledige
 * referentiesjabloon (bestaande demo-data, scripts/seed-demo.ts, hier als bron
 * hergebruikt); de overige branches starten bewust met een kleinere, minder
 * volledige set (FR-104 AC4) — geen gelijkwaardige dekking per branche vereist
 * in deze eerste versie.
 */
export interface BrancheTemplateService {
  name: string;
  standardDurationMinutes: number;
  standardPriceEuros: number;
  vatRate: 0 | 9 | 21;
  isWeatherSensitive: boolean;
  weatherSensitivityType?: 'rain' | 'frost' | 'wind';
}

export interface Industry {
  id: string;
  label: string;
}

export const INDUSTRIES: Industry[] = [
  { id: 'glazenwassers', label: 'Glazenwassers' },
  { id: 'schoonmaak', label: 'Schoonmaakbedrijven' },
  { id: 'hovenier', label: 'Hoveniers / groenonderhoud' },
  { id: 'dakgoot_gevel', label: 'Dakgoot- en gevelreiniging' },
  { id: 'ongedierte', label: 'Ongediertebestrijding' },
  { id: 'installatie_cv_airco', label: 'Installatie / CV / airco-onderhoud' },
  { id: 'overig', label: 'Overig' },
];

export const BRANCHE_TEMPLATES: Record<string, BrancheTemplateService[]> = {
  glazenwassers: [
    {
      name: 'Glasbewassing buiten',
      standardDurationMinutes: 30,
      standardPriceEuros: 18,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
    {
      name: 'Glasbewassing binnen',
      standardDurationMinutes: 40,
      standardPriceEuros: 24,
      vatRate: 21,
      isWeatherSensitive: false,
    },
    {
      name: 'Gevelreiniging',
      standardDurationMinutes: 90,
      standardPriceEuros: 58,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
    {
      name: 'Dakgoot reinigen',
      standardDurationMinutes: 60,
      standardPriceEuros: 45,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
  ],
  schoonmaak: [
    {
      name: 'Kantoorschoonmaak',
      standardDurationMinutes: 90,
      standardPriceEuros: 45,
      vatRate: 21,
      isWeatherSensitive: false,
    },
    {
      name: 'Vloeronderhoud',
      standardDurationMinutes: 60,
      standardPriceEuros: 40,
      vatRate: 21,
      isWeatherSensitive: false,
    },
    {
      name: 'Ramen wassen (interieur)',
      standardDurationMinutes: 30,
      standardPriceEuros: 22,
      vatRate: 21,
      isWeatherSensitive: false,
    },
  ],
  hovenier: [
    {
      name: 'Onderhoud tuin',
      standardDurationMinutes: 120,
      standardPriceEuros: 85,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
    {
      name: 'Heg snoeien',
      standardDurationMinutes: 60,
      standardPriceEuros: 55,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
  ],
  dakgoot_gevel: [
    {
      name: 'Dakgoot reinigen',
      standardDurationMinutes: 60,
      standardPriceEuros: 45,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
    {
      name: 'Gevelreiniging',
      standardDurationMinutes: 90,
      standardPriceEuros: 58,
      vatRate: 21,
      isWeatherSensitive: true,
      weatherSensitivityType: 'rain',
    },
  ],
  ongedierte: [
    {
      name: 'Inspectie en behandeling',
      standardDurationMinutes: 45,
      standardPriceEuros: 65,
      vatRate: 21,
      isWeatherSensitive: false,
    },
    {
      name: 'Preventieve controle',
      standardDurationMinutes: 30,
      standardPriceEuros: 35,
      vatRate: 21,
      isWeatherSensitive: false,
    },
  ],
  installatie_cv_airco: [
    {
      name: 'CV-onderhoudsbeurt',
      standardDurationMinutes: 60,
      standardPriceEuros: 75,
      vatRate: 21,
      isWeatherSensitive: false,
    },
    {
      name: 'Airco-onderhoud',
      standardDurationMinutes: 45,
      standardPriceEuros: 65,
      vatRate: 21,
      isWeatherSensitive: false,
    },
  ],
  overig: [],
};

export function industryLabel(id: string | null): string | null {
  return INDUSTRIES.find((industry) => industry.id === id)?.label ?? null;
}
