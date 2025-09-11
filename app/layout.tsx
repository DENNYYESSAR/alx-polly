import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthNav from "@/components/navigation/AuthNav"; // Import the new AuthNav component

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
          <AuthNav /> {/* Use the AuthNav component here */}
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
