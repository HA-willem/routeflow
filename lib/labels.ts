import type { CustomerInput } from '@/lib/validation/customer';
import type { ObjectInput } from '@/lib/validation/object';
import type { ServiceAgreementInput } from '@/lib/validation/service-agreement';

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
