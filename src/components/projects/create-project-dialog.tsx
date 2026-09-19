'use client';

import { useActionState, useId, useState, type ReactElement } from 'react';
import { Plus } from 'lucide-react';
import { FieldError, FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActionToast } from '@/hooks/use-action-toast';
import { idleState, type ActionState } from '@/lib/validation';
import { createProjectAction } from '@/server/actions/projects';

/** Creates a project, then sends the user straight to it. */
export function CreateProjectDialog({ children }: { children?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const descriptionId = useId();
  const [state, formAction] = useActionState<ActionState, FormData>(createProjectAction, idleState);

  // On success the action redirects straight into the new project, so this
  // only has to deal with the failure case.
  useActionToast(state, { onSuccess: () => setOpen(false) });

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus />
            New project
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give it a name now — you can invite people and add tasks next.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <FormError
            message={state.status === 'error' && !fieldErrors ? state.message : undefined}
          />

          <div className="space-y-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              name="name"
              required
              autoFocus
              maxLength={80}
              placeholder="Website redesign"
              aria-invalid={fieldErrors?.name ? true : undefined}
            />
            <FieldError message={fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              name="description"
              rows={3}
              maxLength={500}
              placeholder="What is this project about? (optional)"
              aria-invalid={fieldErrors?.description ? true : undefined}
            />
            <FieldError message={fieldErrors?.description} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Creating…">Create project</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
