import { MediqHrDashboard } from '@/components/ui/mediq-hr-dashboard';
import type {
  Announcement,
  FormRequest,
  LeaveBalance,
  Profile,
} from '../types/database';

interface HrAdminPageProps {
  requests: FormRequest[];
  profiles: Profile[];
  leaveBalances: LeaveBalance[];
  announcements: Announcement[];
  onInspect: (req: FormRequest) => void;
}

export function HrAdminPage({
  requests,
  profiles,
  leaveBalances,
  announcements,
  onInspect,
}: HrAdminPageProps) {
  return (
    <MediqHrDashboard
      requests={requests}
      profiles={profiles}
      leaveBalances={leaveBalances}
      announcements={announcements}
      onInspect={onInspect}
    />
  );
}
