import { z } from 'zod';
import { isIsoDate, isValidTimeZone } from './dates';

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

const lowercased = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

/** Usernames are stored lowercase, which makes uniqueness case-insensitive. */
export const usernameSchema = z.preprocess(
  lowercased,
  z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores only'),
);

export const emailSchema = z.preprocess(
  lowercased,
  z.string().min(1, 'Email is required').email('Enter a valid email address'),
);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password must be at most 200 characters');

export const displayNameSchema = z.preprocess(
  trimmed,
  z
    .string()
    .min(1, 'Display name is required')
    .max(60, 'Display name must be at most 60 characters'),
);

export const timezoneSchema = z.preprocess(
  trimmed,
  z
    .string()
    .min(1, 'Timezone is required')
    .max(64)
    .refine((value) => isValidTimeZone(value), 'Unknown timezone'),
);

export const isoDateSchema = z.preprocess(
  trimmed,
  z.string().refine((value) => isIsoDate(value), 'Enter a valid date'),
);

const cuidSchema = z.string().min(1, 'Missing identifier').max(64);

export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const taskStatusSchema = z.enum(['TODO', 'DONE']);
export const periodSchema = z.enum(['daily', 'weekly', 'monthly']);

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  timezone: z.preprocess(trimmed, z.string().max(64).optional()),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** Only same-origin absolute paths are accepted, so `?next=` cannot be abused. */
export const nextPathSchema = z
  .string()
  .optional()
  .transform((value) =>
    value && value.startsWith('/') && !value.startsWith('//') ? value : undefined,
  );

export const loginSchema = z.object({
  /** Email address or username — we work out which on the server. */
  identifier: z.preprocess(lowercased, z.string().min(1, 'Enter your email or username').max(200)),
  password: z.string().min(1, 'Enter your password').max(200),
  timezone: z.preprocess(trimmed, z.string().max(64).optional()),
  next: nextPathSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateSettingsSchema = z.object({
  displayName: displayNameSchema,
  timezone: timezoneSchema,
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

export const createProjectSchema = z.object({
  name: z.preprocess(
    trimmed,
    z.string().min(1, 'Project name is required').max(80, 'Keep the name under 80 characters'),
  ),
  description: z.preprocess(
    trimmed,
    z.string().max(500, 'Keep the description under 500 characters').optional(),
  ),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.extend({
  projectId: cuidSchema,
});

export const projectIdSchema = z.object({ projectId: cuidSchema });

export const addMemberSchema = z.object({
  projectId: cuidSchema,
  username: usernameSchema,
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const removeMemberSchema = z.object({
  projectId: cuidSchema,
  userId: cuidSchema,
});

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `undefined` (field omitted/blank) means "default to the creator";
 * the literal `'unassigned'` means "explicitly nobody".
 */
export const UNASSIGNED = 'unassigned' as const;

const optionalAssignee = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.union([z.literal(UNASSIGNED), cuidSchema]).optional(),
);

export const createTaskSchema = z.object({
  projectId: cuidSchema,
  title: z.preprocess(
    trimmed,
    z.string().min(1, 'Task title is required').max(160, 'Keep the title under 160 characters'),
  ),
  description: z.preprocess(
    trimmed,
    z.string().max(2000, 'Keep the description under 2000 characters').optional(),
  ),
  priority: prioritySchema.default('MEDIUM'),
  dueDate: isoDateSchema,
  assigneeId: optionalAssignee,
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.extend({
  taskId: cuidSchema,
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskIdSchema = z.object({ taskId: cuidSchema });

export const toggleTaskSchema = z.object({
  taskId: cuidSchema,
  done: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
});
export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>;

/* -------------------------------------------------------------------------- */
/* Filters & stats query strings                                              */
/* -------------------------------------------------------------------------- */

export const taskFilterSchema = z.object({
  assignee: z.string().max(64).optional(),
  status: z.enum(['all', 'todo', 'done']).catch('all'),
  overdue: z.preprocess((value) => value === 'true' || value === '1', z.boolean()).catch(false),
});
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;

export const statsQuerySchema = z.object({
  period: periodSchema.catch('daily'),
  anchor: z
    .string()
    .optional()
    .transform((value) => (value && isIsoDate(value) ? value : undefined)),
});
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Server-action result helpers                                               */
/* -------------------------------------------------------------------------- */

/** Uniform shape every server action returns so forms can render field errors. */
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string; redirectTo?: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };

export const idleState: ActionState = { status: 'idle' };

/** Flattens a ZodError into `{ field: firstMessage }`. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Turns a failed parse into the error half of `ActionState`. */
export function invalid(
  error: z.ZodError,
  message = 'Please fix the highlighted fields.',
): ActionState {
  return { status: 'error', message, fieldErrors: fieldErrorsFrom(error) };
}
