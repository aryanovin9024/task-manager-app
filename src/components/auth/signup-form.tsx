'use client';

import { useActionState, useState } from 'react';
import { formErrorMessage } from '@/components/auth/form-error-message';
import { TimezoneField } from '@/components/auth/timezone-field';
import { FieldError, FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleState, type ActionState } from '@/lib/validation';
import { signupAction } from '@/server/actions/auth';

/** The fields this form renders an inline error for; everything else is a banner. */
const VISIBLE_FIELDS = ['displayName', 'email', 'username', 'password'] as const;

export function SignupForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(signupAction, idleState);

  // React resets an uncontrolled form once the action settles. Holding the
  // three identity fields in state means a taken email or username does not
  // cost the user everything they typed.
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;
  // Duplicate email/username come back as field errors and are rendered inline;
  // the banner is only for problems that belong to no single visible field.
  const formError = formErrorMessage(state, VISIBLE_FIELDS);

  // `signupAction` redirects to /dashboard on success.
  return (
    <form action={formAction} className="space-y-4">
      <FormError message={formError} />

      <div className="grid gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={Boolean(fieldErrors?.displayName)}
        />
        <FieldError message={fieldErrors?.displayName} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors?.email)}
        />
        <FieldError message={fieldErrors?.email} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-describedby="username-hint"
          aria-invalid={Boolean(fieldErrors?.username)}
        />
        <p id="username-hint" className="text-muted-foreground text-xs">
          3–20 characters. Lowercase letters, numbers and underscores.
        </p>
        <FieldError message={fieldErrors?.username} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="password-hint"
          aria-invalid={Boolean(fieldErrors?.password)}
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          At least 8 characters.
        </p>
        <FieldError message={fieldErrors?.password} />
      </div>

      <TimezoneField />

      <SubmitButton size="lg" className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
