'use client';

import { useEffect, useRef, useTransition } from 'react';
import type { SessionUser } from '@/lib/session';
import { syncTimezoneAction } from '@/server/actions/settings';

/**
 * Keeps an account that has never picked a timezone in step with the browser.
 * Runs at most once per mount and never touches a timezone the user chose
 * themselves (`timezoneAuto === false`). Renders nothing.
 */
export function TimezoneSync({ user }: { user: SessionUser }) {
  const [, startTransition] = useTransition();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (!user.timezoneAuto) return;
    hasRun.current = true;

    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }

    const timezone = detected;
    if (!timezone || timezone === user.timezone) return;

    startTransition(() => {
      void syncTimezoneAction(timezone);
    });
  }, [user.timezoneAuto, user.timezone, startTransition]);

  return null;
}
