/**
 * Auth Layout
 * 
 * Layout for authentication pages (login, register).
 * These pages don't need the main navigation.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
