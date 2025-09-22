'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthStatusClientComponent';
import { useRouter } from 'next/navigation';

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export default function ProfilePage() {
  const { session, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth'); // Redirect to login if not authenticated
      return;
    }

    async function fetchProfile() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Failed to load profile data.");
      } else if (profileData) {
        setProfile({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: session.user.email, // Get email from session
        });
      }
      setLoading(false);
    }

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, authLoading, session, router]);

  if (loading || authLoading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!profile) {
    return <div className="text-center py-8 text-muted-foreground">Profile not found.</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))] py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Your Profile</CardTitle>
          <CardDescription className="text-center">View your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name</Label>
            <Input id="first-name" value={profile.first_name || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name</Label>
            <Input id="last-name" value={profile.last_name || 'N/A'} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email || 'N/A'} readOnly />
          </div>
          {/* You can add more profile details here */}
          <Button onClick={() => router.push('/polls')} className="w-full">Back to Polls</Button>
        </CardContent>
      </Card>
    </div>
  );
}
