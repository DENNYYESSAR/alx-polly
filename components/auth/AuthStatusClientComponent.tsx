"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface AuthStatusClientComponentProps {
  children: (isAuthenticated: boolean, session: Session | null) => ReactNode;
}

export default function AuthStatusClientComponent({ children }: AuthStatusClientComponentProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      console.log("AuthStatusClientComponent: Initial session", session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      console.log("AuthStatusClientComponent: Auth state change", _event, session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return children(isAuthenticated, session); // Render children with isAuthenticated and session
}
