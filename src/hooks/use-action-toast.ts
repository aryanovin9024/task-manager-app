'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ActionState } from '@/lib/validation';

/**
 * Fires a success or error toast whenever a server action's state changes.
 * Pass the state returned by `useActionState`.
 */
export function useActionToast(
  state: ActionState,
  options?: { onSuccess?: () => void; showFieldErrors?: boolean },
) {
  const previous = useRef<ActionState>(state);
  const onSuccess = options?.onSuccess;
  const showFieldErrors = options?.showFieldErrors ?? false;

  useEffect(() => {
    if (state === previous.current) return;
    previous.current = state;

    if (state.status === 'success') {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (state.status === 'error') {
      // Field-level errors are rendered inline; only shout about form-level ones.
      if (showFieldErrors || !state.fieldErrors) toast.error(state.message);
    }
  }, [state, onSuccess, showFieldErrors]);
}
