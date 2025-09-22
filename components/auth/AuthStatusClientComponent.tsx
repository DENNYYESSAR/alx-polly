"use client";

import { useState, useEffect, ReactNode, createContext, useContext } from "react";
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  userId: string | null;
  currentUserRole: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getActiveSession() {
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error);
      }
      setSession(initialSession);
      setIsAuthenticated(!!initialSession);
      setUserId(initialSession?.user?.id || null);
      if (initialSession?.user?.id) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', initialSession.user.id)
          .single();

        if (roleData) {
          setCurrentUserRole(roleData.role);
        } else if (roleError && roleError.code !== 'PGRST116') {
          console.error("Error fetching initial user role:", roleError);
        } else {
          setCurrentUserRole(null);
        }
      }
      setLoading(false);
    }

    getActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      if (session?.user?.id) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: roleData, error: roleError }) => {
            if (roleData) {
              setCurrentUserRole(roleData.role);
            } else if (roleError && roleError.code !== 'PGRST116') {
              console.error("Error fetching user role on auth state change:", roleError);
            } else {
              setCurrentUserRole(null);
            }
          });
      } else {
        setCurrentUserRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  return (
    <AuthContext.Provider value={{ session, isAuthenticated, userId, currentUserRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
