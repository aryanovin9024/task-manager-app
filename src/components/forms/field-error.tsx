import { cn } from '@/lib/utils';

/** Renders the inline validation message under a form field. */
export function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn('text-destructive text-sm', className)}>
      {message}
    </p>
  );
}

/** Renders a whole-form error, e.g. "invalid credentials". */
export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm',
        className,
      )}
    >
      {message}
    </div>
  );
}
