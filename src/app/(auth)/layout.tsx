import { CircleCheckBig } from 'lucide-react';

/**
 * Shell for the signed-out pages. Deliberately quiet: a wordmark, a single
 * column and a lot of air. Each page renders its own card inside it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pwa-safe-y grid min-h-svh place-items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <CircleCheckBig className="text-primary size-5" aria-hidden="true" />
          <span className="font-heading text-base font-medium tracking-tight">Task Manager</span>
        </div>
        {children}
      </div>
    </main>
  );
}
