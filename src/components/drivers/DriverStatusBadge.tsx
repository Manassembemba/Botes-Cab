import { StatusBadge } from '@/components/ui/StatusBadge';

interface DriverStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function DriverStatusBadge({ status }: DriverStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
