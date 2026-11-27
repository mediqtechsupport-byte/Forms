import { MediqBossDashboard } from '@/components/ui/mediq-boss-dashboard';
import type { FormRequest, Profile } from '../types/database';

interface BossAdminPageProps {
  requests: FormRequest[];
  profiles: Profile[];
  onInspect: (req: FormRequest) => void;
}

export function BossAdminPage({
  requests,
  profiles,
  onInspect,
}: BossAdminPageProps) {
  return (
    <MediqBossDashboard
      requests={requests}
      profiles={profiles}
      onInspect={onInspect}
    />
  );
}
