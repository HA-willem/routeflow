-- 041_company_type_industry.sql
-- Sprint 12 — modulaire MKB/ZZP/branche-configuratie (FR-100/FR-069,
-- PRD § 19 A-33). Echte kolommen i.p.v. config_json: A-13/A-20 gebruikten
-- config_json specifiek omdat er nog geen instellingen-UI was — die UI wordt
-- dit sprint (FR-100, Bedrijfsinstellingen-pagina) voor het eerst gebouwd, dus
-- dit is het natuurlijke moment om te stoppen met config_json overladen voor
-- gestructureerde velden (41_CodingStandards.md § 4-precedent: geen nieuwe
-- ongestructureerde velden waar een kolom kan).
--
-- company_type stuurt uitsluitend standaardwaarden/onboarding-vragen, nooit
-- UI-zichtbaarheid (PRD § 19 A-33) — het bestaande, betrouwbaardere "1 actieve
-- medewerker → weekweergave"-gedrag (27_PaginaOverzicht.md § 1.2) blijft de
-- bron voor structureel UI-gedrag en wordt door dit veld niet aangeraakt.

create type public.company_type as enum ('zzp', 'mkb');

alter table public.companies
  add column company_type public.company_type,
  add column industry varchar(50),
  add column instant_invoice_on_complete boolean not null default false;

comment on column public.companies.company_type is 'FR-100 AC4 — stuurt alleen standaardwaarden/onboarding, nooit UI-zichtbaarheid (PRD § 19 A-33).';
comment on column public.companies.industry is 'FR-100 AC5/FR-104 — branche-sleutel (vaste lijst in de applicatielaag, lib/branche-templates), geen eigen enum: nieuwe branches mogen zonder migratie toegevoegd worden.';
comment on column public.companies.instant_invoice_on_complete is 'FR-069 — "direct factureren bij afronden" (ZZP-versnelling). Default uit; blijft binnen BR-702, want de verzendactie is en blijft mens-geïnitieerd.';
