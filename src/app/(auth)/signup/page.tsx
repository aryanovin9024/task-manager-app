import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h1>Create your account</h1>
          </CardTitle>
          <CardDescription>A few details and you are in.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            Your timezone is detected automatically and can be changed in Settings.
          </p>
        </CardFooter>
      </Card>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
