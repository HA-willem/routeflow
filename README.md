# RouteFlow — Documentatieproject

Premium SaaS voor Nederlandse servicebedrijven met terugkerende werkzaamheden (start: glazenwassers).

## Status
- ✅ `docs/00_PRD.md` — volledig geschreven (single source of truth, ~4.200 woorden; per hoofdstuk uitbreidbaar)
- ✅ `docs/MASTER_PROMPT.md` — werkinstructie voor AI-agents
- 🔲 `docs/01`–`39` — professionele outlines klaar, uitwerking volgt document voor document

## Werkwijze (met Claude Code)
1. Open deze map in VS Code.
2. Start Claude Code in de projectroot.
3. Vraag per document: *"Werk docs/01_Productvisie.md volledig uit conform MASTER_PROMPT.md en het PRD."*
4. Review, zet status op DONE, ga naar het volgende document.
5. Pas ná document 39: start met code (fase MVP, zie PRD §5.2).

## Regels
- `00_PRD.md` wint bij elk conflict.
- Geen code totdat alle documentatie gereed is.
- Open beslissingen: routing-provider (A-06, → doc 14) en WhatsApp-BSP (A-08, → doc 19).
