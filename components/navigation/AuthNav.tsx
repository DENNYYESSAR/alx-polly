"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../auth/AuthStatusClientComponent";
import { FaBars, FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AuthNav() {
  const { isAuthenticated, session, loading, userId } = useAuth();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex items-center gap-4">
      <nav className="hidden sm:flex items-center gap-4">
        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
          Home
        </Link>
        {isAuthenticated && (
          <>
            <Link href="/polls" className="text-sm font-medium transition-colors hover:text-primary">
              My Polls
            </Link>
            <Link href="/create-poll" className="text-sm font-medium transition-colors hover:text-primary">
              Create Poll
            </Link>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <FaSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <FaMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isAuthenticated ? (
          <Button onClick={handleLogout} variant="outline" className="text-sm font-medium">
            Logout
          </Button>
        ) : (
          <Button asChild className="text-sm font-medium">
            <Link href="/auth">Login</Link>
          </Button>
        )}

        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.user?.user_metadata.avatar_url || ""} />
          <AvatarFallback>{session?.user?.email ? session.user.email[0].toUpperCase() : "U"}</AvatarFallback>
        </Avatar>

        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <FaBars className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">Home</Link>
              </DropdownMenuItem>
              {isAuthenticated && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/polls">My Polls</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create-poll">Create Poll</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleLogout}>{isAuthenticated ? "Logout" : "Login"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
