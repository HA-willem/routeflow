# MASTER_PROMPT.md — Werkinstructie voor AI-agents

Jij bent een AI-agent (of mens) die meewerkt aan **ServOps**. Dit document bepaalt hoe je werkt.

## 1. Bronnenhiërarchie
1. `00_PRD.md` is de enige bron van waarheid. Bij conflict wint het PRD.
2. Deeldocumenten `01`–`39` werken domeinen uit binnen de kaders van het PRD.
3. Niets in code of documentatie mag het PRD stilzwijgend tegenspreken. Wil je afwijken → stel eerst een PRD-revisie voor (met motivatie en impact).

## 2. Terminologie
Gebruik exact de domeintermen uit PRD §6: Bedrijf (tenant), Klant, Object, **Dienstafspraak**, Beurt, Route, Dienst, Medewerker. Nederlands in UI en documentatie; Engels toegestaan in code-identifiers, maar domeintermen consistent vertaald (documenteer de mapping in 12_Entiteiten.md).

## 3. Fasering
- Eerst documentatie volledig (00–39), dán pas code.
- Codeontwikkeling later strikt per fase: MVP → V1 → V2 (scopetabel PRD §5.2). Bouw niets uit een latere fase "omdat het makkelijk meegenomen kan worden".

## 4. Documentconventies
- Markdown, Nederlandse taal, tabellen waar logisch.
- Elk document begint met: doel, status, versie, relaties met andere documenten.
- Requirements genummerd (FR-xxx, NFR-xxx, BR-xxx) — nummers zijn stabiel, nooit hergebruiken.
- Benoem aannames expliciet en registreer ze in PRD §19.
- Beschrijf altijd: happy path, validaties, foutmeldingen, edge cases, lege staten.

## 5. Technische kaders (niet onderhandelbaar zonder PRD-revisie)
Next.js (App Router) · Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions) · Vercel · Tailwind · Mollie · PWA. Multi-tenancy via RLS op `bedrijf_id`. Provider-adapters voor betalingen, WhatsApp, routing, weer.

## 6. Definition of Done — documentatiefase
Een document is klaar als: (a) alle secties uit zijn outline ingevuld zijn, (b) het geen TODO's meer bevat, (c) het geen conflict met het PRD heeft, (d) edge cases en foutmeldingen beschreven zijn, (e) een reviewer zonder voorkennis het domein kan bouwen.

## 7. Werkwijze per sessie
1. Lees `00_PRD.md` en het doeldocument.
2. Controleer gerelateerde documenten (staan in de kop van elk document).
3. Schrijf/actualiseer het document volledig.
4. Werk de statusregel bij (TODO → IN REVIEW → DONE) en noteer wijzigingen in de changelog onderaan.
5. Schrijf nooit alleen een analyse of rapport. Eindig elke sessie/elk document altijd met een concrete, uitvoerbare opdracht of prompt voor de volgende stap, zodat de ontwikkeling direct kan doorgaan.
