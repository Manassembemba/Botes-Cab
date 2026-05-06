import { StatusBadge } from '@/components/ui/StatusBadge';

interface RemboursementStatusBadgeProps {
  status: string;
}

export function RemboursementStatusBadge({ status }: RemboursementStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
