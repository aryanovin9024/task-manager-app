'use client';

import { useActionState, useCallback, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
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
import { Button } from '@/components/ui/button';
import { useActionToast } from '@/hooks/use-action-toast';
import { idleState, type ActionState } from '@/lib/validation';
import { deleteTaskAction } from '@/server/actions/tasks';

interface DeleteTaskDialogProps {
  taskId: string;
  /** Shown in the confirmation copy so nobody deletes the wrong row. */
  title: string;
}

export function DeleteTaskDialog({ taskId, title }: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
          <span className="sr-only">Delete task “{title}”</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” will be removed for everyone on this project. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/*
          Kept inside the content, which Radix unmounts on close, so a failed
          attempt's error banner does not reappear the next time it is opened.
        */}
        <DeleteTaskForm taskId={taskId} onDone={close} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteTaskForm({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const [state, formAction] = useActionState<ActionState, FormData>(deleteTaskAction, idleState);

  useActionToast(state, { onSuccess: onDone });

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="taskId" value={taskId} />
      <FormError message={state.status === 'error' ? state.message : undefined} />
      <AlertDialogFooter>
        {/* Radix renders a bare <button>, which would submit the form without this. */}
        <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
        <SubmitButton variant="destructive" pendingLabel="Deleting…">
          Delete task
        </SubmitButton>
      </AlertDialogFooter>
    </form>
  );
}
