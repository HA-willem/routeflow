/**
 * Voorbeeldweergave-indicatie — zolang de Sprint 7-agents nog niet draaien,
 * markeert deze chip elk AI-onderdeel expliciet als interfacevoorbeeld
 * (ADR-011-vertrouwensmodel: geen verzonnen AI als echt presenteren).
 */
export function AiPreviewBadge() {
  return (
    <span
      title="De AI-agents (Sprint 7) zijn nog niet actief — dit onderdeel toont de interface met voorbeeldcontent."
      className="border-border text-text-muted inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-xs font-medium"
    >
      Voorbeeldweergave
    </span>
  );
}
