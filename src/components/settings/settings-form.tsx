'use client';

import { useActionState, useId, useMemo } from 'react';
import { FieldError, FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActionToast } from '@/hooks/use-action-toast';
import type { SessionUser } from '@/lib/session';
import { idleState, type ActionState } from '@/lib/validation';
import { updateSettingsAction } from '@/server/actions/settings';

/** Used only where `Intl.supportedValuesOf` is unavailable. Always includes UTC. */
const FALLBACK_TIME_ZONES: readonly string[] = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Kolkata',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Dublin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Warsaw',
  'Pacific/Auckland',
];

export function SettingsForm({ user }: { user: SessionUser }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateSettingsAction,
    idleState,
  );
  useActionToast(state);

  const displayNameId = useId();
  const timezoneId = useId();
  const timezoneHintId = useId();

  // The full IANA list where the runtime exposes it, a curated list otherwise.
  // Either way the user's own zone is present, so the select always has a value.
  const timeZones = useMemo(() => {
    let zones: readonly string[] = [];
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch {
      zones = [];
    }
    const all = new Set(zones.length > 0 ? zones : FALLBACK_TIME_ZONES);
    all.add('UTC');
    all.add(user.timezone);
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [user.timezone]);

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.status === 'error' && !fieldErrors ? state.message : undefined} />

      <div className="space-y-2">
        <Label htmlFor={displayNameId}>Display name</Label>
        <Input
          id={displayNameId}
          name="displayName"
          defaultValue={user.displayName}
          maxLength={60}
          required
          autoComplete="name"
          aria-invalid={fieldErrors?.displayName ? true : undefined}
        />
        <FieldError message={fieldErrors?.displayName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={timezoneId}>Timezone</Label>
        <Select name="timezone" defaultValue={user.timezone} required>
          <SelectTrigger
            id={timezoneId}
            className="w-full"
            aria-describedby={timezoneHintId}
            aria-invalid={fieldErrors?.timezone ? true : undefined}
          >
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72 max-w-[calc(100vw-2rem)]">
            {timeZones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id={timezoneHintId} className="text-muted-foreground text-xs">
          All due dates, overdue flags and productivity periods are calculated in this timezone.
        </p>
        <FieldError message={fieldErrors?.timezone} />
      </div>

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
