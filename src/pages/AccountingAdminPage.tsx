import { MediqAccountingDashboard } from '@/components/ui/mediq-accounting-dashboard';
import type { FormRequest } from '../types/database';

interface AccountingAdminPageProps {
  requests: FormRequest[];
  onInspect: (req: FormRequest) => void;
}

export function AccountingAdminPage({
  requests,
  onInspect,
}: AccountingAdminPageProps) {
  return (
    <MediqAccountingDashboard
      requests={requests}
      onInspect={onInspect}
    />
  );
}
