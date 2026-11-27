import { MediqEmployeeDashboard } from '@/components/ui/mediq-employee-dashboard';
import type { Announcement, FormRequest, RequestType } from '../types/database';

interface EmployeePortalProps {
  myRequests: FormRequest[];
  announcements: Announcement[];
  onOpenNewForm: (type: RequestType) => void;
  onInspect: (req: FormRequest) => void;
}

export function EmployeePortal({
  myRequests,
  announcements,
  onOpenNewForm,
  onInspect,
}: EmployeePortalProps) {
  return (
    <MediqEmployeeDashboard
      myRequests={myRequests}
      announcements={announcements}
      onOpenNewForm={onOpenNewForm}
      onInspect={onInspect}
    />
  );
}
