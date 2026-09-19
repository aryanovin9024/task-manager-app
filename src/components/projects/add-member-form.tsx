'use client';

import { useActionState, useId, useRef } from 'react';
import { UserPlus } from 'lucide-react';
import { FieldError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionToast } from '@/hooks/use-action-toast';
import { idleState, type ActionState } from '@/lib/validation';
import { addMemberAction } from '@/server/actions/projects';

/** Owner-only: invite an existing coworker to the project by username. */
export function AddMemberForm({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const usernameId = useId();
  const [state, formAction] = useActionState<ActionState, FormData>(addMemberAction, idleState);

  useActionToast(state, {
    onSuccess: () => {
      if (inputRef.current) inputRef.current.value = '';
    },
  });

  const usernameError = state.status === 'error' ? state.fieldErrors?.username : undefined;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />

      <Label htmlFor={usernameId}>Add a coworker by username</Label>
      <div className="flex gap-2">
        <Input
          id={usernameId}
          ref={inputRef}
          name="username"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="username"
          maxLength={20}
          aria-invalid={usernameError ? true : undefined}
          className="min-w-0 flex-1"
        />
        <SubmitButton pendingLabel="Adding…">
          <UserPlus />
          Add
        </SubmitButton>
      </div>
      <FieldError message={usernameError} />
    </form>
  );
}
