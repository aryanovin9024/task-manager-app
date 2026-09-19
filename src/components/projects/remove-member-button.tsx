'use client';

import { useActionState, useState } from 'react';
import { UserMinus } from 'lucide-react';
import { FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useActionToast } from '@/hooks/use-action-toast';
import { idleState, type ActionState } from '@/lib/validation';
import { removeMemberAction } from '@/server/actions/projects';
import type { ProjectMemberSummary } from '@/server/types';

/** Owner-only: take someone off the project. Their tasks stay, unassigned. */
export function RemoveMemberButton({
  projectId,
  member,
}: {
  projectId: string;
  member: ProjectMemberSummary;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(removeMemberAction, idleState);

  useActionToast(state, { onSuccess: () => setOpen(false) });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <UserMinus />
          <span className="sr-only">Remove {member.displayName} from this project</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member.displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove {member.displayName} from this project? Their tasks stay, but they&rsquo;ll no
            longer be assigned to anyone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state.status === 'error' ? <FormError message={state.message} /> : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={formAction} className="contents">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="userId" value={member.id} />
            <SubmitButton variant="destructive" pendingLabel="Removing…">
              Remove
            </SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
