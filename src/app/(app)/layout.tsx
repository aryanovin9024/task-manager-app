import { AppSidebar } from '@/components/shell/app-sidebar';
import { TimezoneSync } from '@/components/shell/timezone-sync';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { requireUser } from '@/lib/session';

/**
 * The signed-in shell. Everything below `(app)` is guarded by `requireUser()`,
 * so a page in this segment can assume there is a session.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      {/*
        `SidebarInset` *is* the page's <main> element. The content therefore goes
        in a plain <div>: a second <main> nested inside it would be invalid HTML
        and would announce two "main" landmarks.
      */}
      <SidebarInset>
        <header className="bg-background/95 pwa-safe-top sticky top-0 z-10 flex min-h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger />
          {/*
            This Radix build only sets `data-orientation`, so the primitive's own
            `data-vertical:w-px` never matches and the divider would collapse to
            zero width — the size is set explicitly here instead.
          */}
          <Separator orientation="vertical" className="h-6 w-px self-center" />
          <span className="truncate text-sm font-medium">Task Manager</span>
        </header>
        <div className="pwa-safe-bottom flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
      <TimezoneSync user={user} />
    </SidebarProvider>
  );
}
