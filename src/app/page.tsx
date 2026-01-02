import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Home Page
 * 
 * Redirects to dashboard if authenticated, otherwise to login.
 */
export default async function Home() {
  const session = await auth();
  
  if (session?.user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
