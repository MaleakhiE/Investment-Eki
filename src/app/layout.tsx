import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import FeedbackProvider from "@/components/providers/FeedbackProvider";

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Track your income, expenses, and investments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <SessionProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
