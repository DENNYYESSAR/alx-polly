import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthNav from "@/components/navigation/AuthNav"; // Import the new AuthNav component
import AuthProvider from "@/components/auth/AuthStatusClientComponent";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polly",
  description: "A polling app with QR code sharing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <header className="flex items-center justify-between p-4 border-b px-4 sm:px-6 lg:px-8">
              <div className="text-xl font-bold">Polly</div>
              <AuthNav /> {/* Use the AuthNav component here */}
            </header>
            <main className="flex-grow container mx-auto p-4 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
            <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-t text-sm text-muted-foreground px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                {/* Placeholder for left footer icon */}
                <span>P</span>
                <span>© 2025 Polly. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Placeholder for right footer icon */}
                <span>U</span>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
