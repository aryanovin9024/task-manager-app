'use client';

import Link from 'next/link';
import { SquareCheckBig } from 'lucide-react';
import { NavMain } from '@/components/shell/nav-main';
import { UserMenu } from '@/components/shell/user-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { SessionUser } from '@/lib/session';

/**
 * The application sidebar. Collapses to icons on desktop and is rendered as a
 * sheet on mobile by the shadcn `Sidebar` primitive.
 */
export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Task Manager">
              <Link href="/dashboard">
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                  <SquareCheckBig className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Task Manager</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Projects &amp; productivity
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
