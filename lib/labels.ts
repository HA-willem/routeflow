import type { CustomerInput } from '@/lib/validation/customer';
import type { ObjectInput } from '@/lib/validation/object';
import type { ServiceAgreementInput } from '@/lib/validation/service-agreement';
import type { Database } from '@/types/database.types';

type JobStatus = Database['public']['Enums']['job_status'];
type FeatureRequestStatus = Database['public']['Enums']['feature_request_status'];
type PlatformProposalStatus = Database['public']['Enums']['platform_proposal_status'];
type ProposalRiskLevel = Database['public']['Enums']['proposal_risk_level'];

/**
 * Nederlandse labels voor domein-enums — 12_Entiteiten.md. Voorheen per pagina/
 * formulier los gedefinieerd (klanten/page.tsx, klanten/[id]/page.tsx,
 * objecten/[objectId]/page.tsx, ObjectForm.tsx, ServiceAgreementForm.tsx),
 * hier gedeeld getrokken om drift tussen de kopieën te voorkomen.
 */
export const CUSTOMER_TYPE_LABEL: Record<CustomerInput['type'], string> = {
  person: 'Particulier',
  business: 'Zakelijk',
};

export const BILLING_PREFERENCE_LABEL: Record<CustomerInput['billingPreference'], string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  post: 'Post',
};

export const OBJECT_TYPE_LABEL: Record<ObjectInput['type'], string> = {
  residence: 'Woning',
  commercial: 'Bedrijfspand',
  complex: 'Appartementencomplex',
  other: 'Overig',
};

export const FREQUENCY_LABEL: Record<ServiceAgreementInput['frequencyType'], string> = {
  weekly: 'Wekelijks',
  biweekly: 'Elke 2 weken',
  monthly: 'Maandelijks',
  quarterly: 'Elk kwartaal',
  yearly: 'Jaarlijks',
  once: 'Eenmalig',
  custom: 'Aangepast',
};

/** Beurt-status (job_status, 12_Entiteiten.md) — Planning-module (Sprint 4 Frontend). */
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  proposed: 'Voorgesteld',
  planned: 'Gepland',
  en_route: 'Onderweg',
  completed: 'Uitgevoerd',
  invoiced: 'Gefactureerd',
  not_home: 'Niet thuis',
  cancelled: 'Geannuleerd',
  rescheduling: 'Wordt herpland',
};

/**
 * Kleur is nooit de enige informatiedrager (25_DesignSystem.md § 1.2) —
 * StatusBadge toont hier altijd de NL-tekst uit JOB_STATUS_LABEL naast de toon.
 * StatusBadge kent alleen success/warning/muted (26_ComponentLibrary.md § 4);
 * "onderweg" en "gefactureerd" (semantisch info/primary) vallen terug op muted.
 */
export const JOB_STATUS_TONE: Record<JobStatus, 'success' | 'warning' | 'muted'> = {
  proposed: 'muted',
  planned: 'muted',
  en_route: 'muted',
  completed: 'success',
  invoiced: 'success',
  not_home: 'warning',
  cancelled: 'muted',
  rescheduling: 'warning',
};

/** Feature request-status (46_PlatformAdmin.md § 2.3, FR-950/951). */
export const FEATURE_REQUEST_STATUS_LABEL: Record<FeatureRequestStatus, string> = {
  nieuw: 'Nieuw',
  getrieerd: 'Getrieerd',
  voorgesteld: 'Voorgesteld',
  afgewezen: 'Afgewezen',
  gepland: 'Gepland',
  gebouwd: 'Gebouwd',
};

export const FEATURE_REQUEST_STATUS_TONE: Record<
  FeatureRequestStatus,
  'success' | 'warning' | 'muted'
> = {
  nieuw: 'muted',
  getrieerd: 'muted',
  voorgesteld: 'warning',
  afgewezen: 'muted',
  gepland: 'success',
  gebouwd: 'success',
};

/** Product Agent-voorstelstatus (46_PlatformAdmin.md § 1.3/§ 4, BR-901). */
export const PLATFORM_PROPOSAL_STATUS_LABEL: Record<PlatformProposalStatus, string> = {
  open: 'Open',
  approved: 'Goedgekeurd',
  rejected: 'Afgewezen',
  merged: 'Gemerged',
};

export const PLATFORM_PROPOSAL_STATUS_TONE: Record<
  PlatformProposalStatus,
  'success' | 'warning' | 'muted'
> = {
  open: 'warning',
  approved: 'success',
  rejected: 'muted',
  merged: 'success',
};

export const PROPOSAL_RISK_LEVEL_LABEL: Record<ProposalRiskLevel, string> = {
  normal: 'Normaal',
  high_risk: 'High-risk',
};

export const PROPOSAL_RISK_LEVEL_TONE: Record<ProposalRiskLevel, 'success' | 'warning' | 'muted'> =
  {
    normal: 'muted',
    high_risk: 'warning',
  };
