'use client';

import DevSWCleaner from '@/components/system/dev-sw-cleaner';
import IOSPWABanner from '@/components/system/ios-pwa-banner';
import ChunkErrorReload from '@/components/system/chunk-error-reload';
import SWUpdater from '@/components/system/sw-updater';
import ClientErrorReporter from '@/components/system/client-error-reporter';
import { Toaster } from '@/components/ui/toaster';

export default function RuntimeExtras() {
  const isProd = process.env.NODE_ENV === 'production';
  return (
    <>
      {!isProd && <DevSWCleaner />}
      <IOSPWABanner />
      {isProd && <ChunkErrorReload />}
      {isProd && <SWUpdater />}
      {isProd && <ClientErrorReporter />}
      <Toaster />
    </>
  );
}


