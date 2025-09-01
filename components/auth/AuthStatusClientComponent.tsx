"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function AuthStatusClientComponent() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      console.log("AuthStatusClientComponent: Initial session", session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      console.log("AuthStatusClientComponent: Auth state change", _event, session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      ) : (
        <Button asChild>
          <Link href="/auth">Login</Link>
        </Button>
      )}
      <Avatar>
        <AvatarImage src={session?.user?.user_metadata.avatar_url || ""} />
        <AvatarFallback>{session?.user?.email ? session.user.email[0].toUpperCase() : "U"}</AvatarFallback>
      </Avatar>
    </div>
  );
}
