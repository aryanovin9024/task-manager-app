import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings/settings-form';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Settings"
        description="Your profile and how dates are calculated for you."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How your name appears to everyone on your projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm user={user} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>The details you sign in with.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <div className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <dt className="text-muted-foreground text-sm">Email</dt>
                <dd className="font-mono text-sm break-all">{user.email}</dd>
              </div>
              <div className="flex flex-col gap-1 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <dt className="text-muted-foreground text-sm">Username</dt>
                <dd className="font-mono text-sm break-all">@{user.username}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground mt-4 text-xs">
              Your email address and username are fixed — teammates add you to projects by username,
              so it cannot be changed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
