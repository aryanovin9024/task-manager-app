'use client';

import { useActionState, useCallback, useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { FieldError, FormError } from '@/components/forms/field-error';
import { SubmitButton } from '@/components/forms/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useActionToast } from '@/hooks/use-action-toast';
import type { IsoDate } from '@/lib/dates';
import { idleState, UNASSIGNED, type ActionState } from '@/lib/validation';
import { createTaskAction, updateTaskAction } from '@/server/actions/tasks';
import type { Priority, ProjectMemberSummary, TaskListItem } from '@/server/types';

const PRIORITIES: ReadonlyArray<{ value: Priority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export interface TaskDialogProps {
  mode: 'create' | 'edit';
  projectId: string;
  members: ProjectMemberSummary[];
  viewerId: string;
  /** Today in the viewer's timezone — the default due date for a new task. */
  today: IsoDate;
  /** Required in edit mode: the task being changed. */
  task?: TaskListItem;
  /** The trigger. Falls back to a plain "New task" button. */
  children?: React.ReactNode;
}

/**
 * One dialog for both creating and editing, because the two forms are the same
 * six fields and keeping them together stops them drifting apart.
 */
export function TaskDialog({
  mode,
  projectId,
  members,
  viewerId,
  today,
  task,
  children,
}: TaskDialogProps) {
  const isEdit = mode === 'edit';
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm">
            <Plus />
            New task
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Change the details of this task. Everyone on the project sees the update.'
              : 'Give the task a title and a due date. You can reassign it at any time.'}
          </DialogDescription>
        </DialogHeader>

        {/*
          The form — and the action state with it — lives inside the content,
          which Radix unmounts on close. That is what clears a half-finished
          draft and, more importantly, stops last attempt's validation errors
          from greeting you on top of an empty form next time you open it.
        */}
        <TaskForm
          isEdit={isEdit}
          projectId={projectId}
          members={members}
          viewerId={viewerId}
          today={today}
          task={task}
          onDone={close}
        />
      </DialogContent>
    </Dialog>
  );
}

interface TaskFormProps {
  isEdit: boolean;
  projectId: string;
  members: ProjectMemberSummary[];
  viewerId: string;
  today: IsoDate;
  task?: TaskListItem;
  onDone: () => void;
}

function TaskForm({ isEdit, projectId, members, viewerId, today, task, onDone }: TaskFormProps) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    isEdit ? updateTaskAction : createTaskAction,
    idleState,
  );

  useActionToast(state, { onSuccess: onDone });

  const fieldId = useId();
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  const viewerIsMember = members.some((member) => member.id === viewerId);
  const defaultAssignee = isEdit
    ? (task?.assignee?.id ?? UNASSIGNED)
    : viewerIsMember
      ? viewerId
      : UNASSIGNED;

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      {isEdit && task ? <input type="hidden" name="taskId" value={task.id} /> : null}

      <FormError message={state.status === 'error' ? state.message : undefined} />

      <div className="grid gap-2">
        <Label htmlFor={`${fieldId}-title`}>Title</Label>
        <Input
          id={`${fieldId}-title`}
          name="title"
          required
          maxLength={160}
          autoComplete="off"
          placeholder="Write the launch email"
          defaultValue={task?.title ?? ''}
          aria-invalid={Boolean(fieldErrors?.title)}
        />
        <FieldError message={fieldErrors?.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${fieldId}-description`}>Description</Label>
        <Textarea
          id={`${fieldId}-description`}
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Optional detail, links, acceptance criteria…"
          defaultValue={task?.description ?? ''}
          aria-invalid={Boolean(fieldErrors?.description)}
        />
        <FieldError message={fieldErrors?.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-priority`}>Priority</Label>
          <Select name="priority" defaultValue={task?.priority ?? 'MEDIUM'}>
            <SelectTrigger id={`${fieldId}-priority`} className="w-full">
              <SelectValue placeholder="Medium" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={fieldErrors?.priority} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-dueDate`}>Due date</Label>
          {/* The native date input hands back YYYY-MM-DD, which is what the action wants. */}
          <Input
            id={`${fieldId}-dueDate`}
            type="date"
            name="dueDate"
            required
            defaultValue={isEdit ? (task?.dueDate ?? today) : today}
            aria-invalid={Boolean(fieldErrors?.dueDate)}
          />
          <FieldError message={fieldErrors?.dueDate} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${fieldId}-assignee`}>Assignee</Label>
        <Select name="assigneeId" defaultValue={defaultAssignee}>
          <SelectTrigger id={`${fieldId}-assignee`} className="w-full">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.displayName}
                {member.id === viewerId ? ' (You)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors?.assigneeId} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pendingLabel={isEdit ? 'Saving…' : 'Creating…'}>
          {isEdit ? 'Save changes' : 'Create task'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
