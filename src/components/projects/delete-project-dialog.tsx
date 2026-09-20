'use client';

import { useActionState, useState } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
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
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useActionToast } from '@/hooks/use-action-toast';
import { idleState, type ActionState } from '@/lib/validation';
import { deleteProjectAction } from '@/server/actions/projects';
import type { ProjectDetail } from '@/server/types';

/** Owner-only: delete the project and every task inside it. */
export function DeleteProjectDialog({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(deleteProjectAction, idleState);

  // Full document load back to the project list — same reason as
  // CreateProjectDialog. See DECISIONS.md §11.
  useActionToast(state, {
    onSuccess: () => {
      setOpen(false);
      window.location.assign(
        state.status === 'success' ? (state.redirectTo ?? '/projects') : '/projects',
      );
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 />
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Every task in {project.name} will be deleted for everyone on the project. This is
            permanent and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state.status === 'error' ? <FormError message={state.message} /> : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Keep project</AlertDialogCancel>
          <form action={formAction} className="contents">
            <input type="hidden" name="projectId" value={project.id} />
            <SubmitButton variant="destructive" pendingLabel="Deleting…">
              Delete project
            </SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
