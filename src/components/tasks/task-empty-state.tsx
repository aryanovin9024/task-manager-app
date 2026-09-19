import Link from 'next/link';
import { ClipboardList, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface TaskEmptyStateProps {
  projectId: string;
  /** True when the list is empty only because filters are narrowing it. */
  filtered: boolean;
  /** Optional call to action, shown when the project genuinely has no tasks. */
  children?: React.ReactNode;
}

/**
 * Two different nothings: "your filters hid everything" and "there is nothing
 * here yet". They need different words and different escape hatches.
 */
export function TaskEmptyState({ projectId, filtered, children }: TaskEmptyStateProps) {
  if (filtered) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No tasks match these filters</EmptyTitle>
          <EmptyDescription>
            Nothing in this project matches the filters you have set. Widen them, or clear them to
            see every task again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}`}>Clear filters</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No tasks yet</EmptyTitle>
        <EmptyDescription>
          This project is empty. Add the first task and it will show up here for everyone on the
          team.
        </EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
