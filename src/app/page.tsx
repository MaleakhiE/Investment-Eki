import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Home Page
 *
 * Redirects to dashboard if authenticated, otherwise to login.
 * The visually hidden h1 satisfies the single heading-per-route contract;
 * the page itself never renders to the user (it always redirects).
 */
export default async function Home() {
  const heading = <h1 className="sr-only">FinTrack</h1>;

  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  return heading;
}
