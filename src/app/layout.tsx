import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ServiceWorker } from '@/components/shell/service-worker';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Task Manager',
    template: '%s · Task Manager',
  },
  description: 'Shared projects, tasks and productivity for the team.',
  applicationName: 'Task Manager',
  // Installed on a phone the app gets its name, icon and splash screen from
  // here and from the manifest.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Task Manager',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the app paint behind the notch and the home indicator once it is
  // installed; the layout pads itself back out of the way.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e10' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {/* The sidebar renders tooltips when collapsed, and Radix needs a
              provider above them. */}
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <ServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
