import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // There is an unrelated package-lock.json further up the filesystem on some
  // machines; pin the tracing root so the build never walks outside the repo.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  // The default position sits on top of the sidebar's user menu.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
