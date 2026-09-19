'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  pendingLabel?: string;
}

/** A submit button that disables itself and shows a spinner while pending. */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} className={cn(className)} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
