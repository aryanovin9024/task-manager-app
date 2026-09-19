'use client';

import { useEffect, useState } from 'react';

/**
 * Posts the browser's IANA timezone (e.g. `Europe/London`) with the auth forms
 * so a new account starts in the right timezone — see DECISIONS.md §8.
 *
 * It renders empty on the server and fills itself in on mount, so the markup
 * matches on hydration. `Intl` is wrapped because a locked-down or exotic
 * runtime can throw; the server falls back to UTC when the value is blank.
 */
export function TimezoneField() {
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch {
      setTimezone('');
    }
  }, []);

  return <input type="hidden" name="timezone" value={timezone} readOnly />;
}
