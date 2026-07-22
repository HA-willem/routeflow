import { CsvImportWizard } from '@/components/domain/CsvImportWizard';
import { requireOnboardedUser } from '@/lib/auth/session';

import { commitImportAction, validateImportRowsAction } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klanten importeren — ServOps',
};

export default async function KlantenImporterenPage() {
  await requireOnboardedUser();

  return (
    <CsvImportWizard validateAction={validateImportRowsAction} commitAction={commitImportAction} />
  );
}
