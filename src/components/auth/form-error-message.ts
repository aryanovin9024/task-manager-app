import type { ActionState } from '@/lib/validation';

/**
 * Decides what the form-level banner should say.
 *
 * Field-level problems are rendered inline under their input, so the banner is
 * reserved for errors that belong to no single field — "Invalid credentials.",
 * the rate limit, a lost signup race. If an action ever reports an error
 * against a field the form does not show (the hidden `timezone` or `next`, for
 * instance) the message would otherwise vanish and the submit would look like
 * it did nothing, so that case falls back to the banner.
 */
export function formErrorMessage(
  state: ActionState,
  visibleFields: readonly string[],
): string | undefined {
  if (state.status !== 'error') return undefined;
  const { fieldErrors } = state;
  if (!fieldErrors) return state.message;
  const shownInline = visibleFields.some((field) => Boolean(fieldErrors[field]));
  return shownInline ? undefined : state.message;
}
