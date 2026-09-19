import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { nextPathSchema } from '@/lib/validation';

export const metadata: Metadata = { title: 'Log in' };

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  // The same schema the action uses, so only same-origin paths get through and
  // the two can never drift apart.
  const raw = params.next;
  const next = nextPathSchema.parse(Array.isArray(raw) ? raw[0] : raw);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h1>Welcome back</h1>
          </CardTitle>
          <CardDescription>Sign in with your email or username.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            You stay signed in on this device for 30 days.
          </p>
        </CardFooter>
      </Card>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </>
  );
}
