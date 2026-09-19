import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCounts, formatPercent } from '@/lib/productivity';
import type { MemberPeriodStat } from '@/server/types';

export interface MemberStatsTableProps {
  /** Already sorted by the server — rendered in the order given. */
  stats: MemberPeriodStat[];
  rangeLabel: string;
}

/** Who did what in the selected period. Members with nothing due show "—". */
export function MemberStatsTable({ stats, rangeLabel }: MemberStatsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>Per person for {rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No one to measure</EmptyTitle>
              <EmptyDescription>
                This project has no members with work in {rangeLabel}.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead className="text-right">Done</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Productivity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.user?.id ?? 'unassigned'}>
                  <TableCell>
                    {stat.user ? (
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(stat.user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{stat.user.displayName}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            @{stat.user.username}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{stat.done}</TableCell>
                  <TableCell className="text-right tabular-nums">{stat.total}</TableCell>
                  <TableCell className="text-right">
                    <div className="ml-auto w-20">
                      <div
                        className="font-medium tabular-nums"
                        title={formatCounts(stat.done, stat.total)}
                      >
                        {formatPercent(stat.percent)}
                      </div>
                      <div
                        className="bg-muted mt-1 h-1 w-full overflow-hidden rounded-full"
                        aria-hidden="true"
                      >
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${stat.percent ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return letters.join('').toUpperCase();
}
