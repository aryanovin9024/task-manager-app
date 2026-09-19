'use server';

import { revalidatePath } from 'next/cache';
import { isValidTimeZone } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser } from '@/lib/session';
import { invalid, updateSettingsSchema, type ActionState } from '@/lib/validation';

export async function updateSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = updateSettingsSchema.safeParse({
    displayName: formData.get('displayName'),
    timezone: formData.get('timezone'),
  });
  if (!parsed.success) return invalid(parsed.error);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      timezone: parsed.data.timezone,
      // A deliberate choice must never be overwritten by the next login.
      timezoneAuto: false,
    },
  });

  revalidatePath('/', 'layout');
  return { status: 'success', message: 'Settings saved.' };
}

/**
 * Called once from the browser after sign-in so a seeded or imported account
 * picks up a real timezone. Only ever applies while the user has not chosen
 * one themselves.
 */
export async function syncTimezoneAction(timezone: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !user.timezoneAuto) return;
  if (typeof timezone !== 'string' || timezone.length > 64) return;
  if (!isValidTimeZone(timezone) || timezone === user.timezone) return;

  await prisma.user.update({ where: { id: user.id }, data: { timezone } });
  revalidatePath('/', 'layout');
}
