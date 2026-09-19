'use client';

import { useActionState, useState } from 'react';
import { formErrorMessage } from '@/components/auth/form-error-message';
import { TimezoneField } from '@/components/auth/timezone-field';
import { FieldError, FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleState, type ActionState } from '@/lib/validation';
import { loginAction } from '@/server/actions/auth';

/** The fields this form renders an inline error for; everything else is a banner. */
const VISIBLE_FIELDS = ['identifier', 'password'] as const;

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, idleState);

  // React resets an uncontrolled form once the action settles, so the typed
  // identifier is held in state and survives a failed attempt.
  const [identifier, setIdentifier] = useState('');

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;
  const formError = formErrorMessage(state, VISIBLE_FIELDS);

  // `loginAction` redirects on success, so there is no success branch here.
  return (
    <form action={formAction} className="space-y-4">
      <FormError message={formError} />

      <div className="grid gap-2">
        <Label htmlFor="identifier">Email or username</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          aria-invalid={Boolean(fieldErrors?.identifier)}
        />
        <FieldError message={fieldErrors?.identifier} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(fieldErrors?.password)}
        />
        <FieldError message={fieldErrors?.password} />
      </div>

      <TimezoneField />
      {/*
        `loginSchema` reads `next` as an optional *string*, and a missing form
        field arrives as `null`, which fails the parse. The input is therefore
        always rendered; an empty value simply means "no redirect target".
      */}
      <input type="hidden" name="next" value={next ?? ''} />

      <SubmitButton size="lg" className="w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
