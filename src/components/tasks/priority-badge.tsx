import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Priority } from '@/server/types';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

const LABELS: Record<Priority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const VARIANTS: Record<Priority, BadgeVariant> = {
  HIGH: 'destructive',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

/** The small coloured chip that carries a task's priority. */
export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant={VARIANTS[priority]} className={cn('text-xs', className)}>
      {LABELS[priority]}
    </Badge>
  );
}
