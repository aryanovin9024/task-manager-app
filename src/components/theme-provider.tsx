'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/** Follows the operating system's light/dark preference. No manual toggle. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
