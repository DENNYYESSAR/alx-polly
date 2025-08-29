import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import AuthStatusClientComponent from "@/components/auth/AuthStatusClientComponent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALX Polly",
  description: "A polling app with QR code sharing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <header className="flex justify-between items-center p-4 border-b">
          <div className="text-xl font-bold">ALX Polly</div>
          <nav className="flex gap-4">
            <Link href="/polls" className="hover:text-primary">My Polls</Link>
            <Link href="/create-poll" className="hover:text-primary">Create Poll</Link>
          </nav>
          <AuthStatusClientComponent />
        </header>
        <main className="flex-grow container mx-auto p-4">
          {children}
        </main>
        <footer className="flex justify-between items-center p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {/* Placeholder for left footer icon */}
            <span>N</span>
            <span>© 2023 ALX Polly. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Placeholder for right footer icon */}
            <span>U</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
