"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { deletePoll } from "@/lib/actions";

interface Poll {
  id: string;
  question: string;
  description: string | null;
  created_at: string;
  is_private: boolean; // Add is_private to the interface
  poll_options: { id: string; option_text: string; votes_count: number }[];
  user_id: string; // Add user_id to the interface
}

// Helper function to fetch user and their role
async function fetchUserAndRole() {
  const { data: { user } } = await supabase.auth.getUser();
  let currentUserRole: string | null = null;

  if (user) {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData) {
      currentUserRole = roleData.role;
    } else if (roleError && roleError.code !== 'PGRST116') {
      // Log other unexpected errors, but suppress "no rows found" (PGRST116)
      console.error("Error fetching user role:", roleError);
    }
  }
  return { user, currentUserRole };
}

export default function PollsPage() {
  /**
   * @doc PollsPage component displays a dashboard of polls created by the authenticated user.
   * This component fetches user-specific polls from Supabase, handles their display, and provides functionalities
   * for viewing, editing, and deleting polls. It also includes UI elements for creating new polls and shows
   * feedback for loading, error, and deletion states.
   *
   * @returns {JSX.Element} A React component that renders the user's poll dashboard.
   */
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPolls() {
      setLoading(true);
      setError(null);

      const { user, currentUserRole } = await fetchUserAndRole();
      setUserId(user?.id || null);
      setCurrentUserRole(currentUserRole);

      let query = supabase
        .from("polls")
        .select("id, question, description, created_at, is_private, user_id, poll_options(id, option_text, votes_count)") // Include user_id to check ownership

      if (user) {
        // If authenticated, fetch all public polls AND polls created by the user (public or private)
        query = supabase
          .from("polls")
          .select("id, question, description, created_at, is_private, user_id, poll_options(id, option_text, votes_count)")
          .or(`is_private.eq.false,user_id.eq.${user.id}`); // Fetch public polls OR polls owned by the user
      } else {
        // If not authenticated, fetch only public polls
        query = query.eq("is_private", false);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        // Log detailed error and set user-friendly error message
        console.error("Error fetching polls:", JSON.stringify(error, null, 2));
        setError("Failed to load polls.");
      } else {
        setPolls(data as Poll[]);
      }
      setLoading(false);
    }

    fetchPolls();
  }, []); // Dependency array includes router to re-run effect if router changes

  const handleDelete = async (pollId: string) => {
    // Use startTransition for non-blocking UI updates during deletion
    startTransition(async () => {
      // Call the server action to delete the poll
      const result = await deletePoll(pollId);
      if (result.message === "Poll deleted successfully!") {
        // Filter out the deleted poll from the local state to update the UI
        setPolls(polls.filter(poll => poll.id !== pollId));
      } else {
        // Display error message if deletion fails
        setError(result.message);
      }
      setDeletingId(null); // Reset deleting state
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading polls...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{userId ? "My Polls" : "Public Polls"}</h1>
        {userId && (
          <Button asChild>
            <Link href="/create-poll">Create New Poll</Link>
          </Button>
        )}
      </div>

      {error && <p className="text-center text-red-500">Error: {error}</p>}

      {polls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{userId ? "You haven't created any polls yet." : "No public polls available."}</p>
          {userId && <p>Click "Create New Poll" to get started!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => {
            // Calculate total votes for the current poll
            const totalVotes = poll.poll_options.reduce((sum, option) => sum + option.votes_count, 0);
            return (
              <Card key={poll.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link href={`/polls/${poll.id}`} className="hover:underline">
                      {poll.question}
                    </Link>
                    {/* Display lock icon for private polls, globe icon for public polls */}
                    {poll.is_private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" aria-label="Private Poll" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-muted-foreground"
                        aria-label="Public Poll"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                    )}
                  </CardTitle>
                  {poll.description && <CardDescription>{poll.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p>{poll.poll_options.length} options</p>
                  {totalVotes > 0 ? (
                    <div className="space-y-1 mt-2">
                      {poll.poll_options.map((option) => {
                        const percentage = Math.round((option.votes_count / totalVotes) * 100);
                        return (
                          <p key={option.id} className="text-sm text-muted-foreground">
                            {option.option_text}: {option.votes_count} votes ({percentage}%)
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">No votes yet.</p>
                  )}
                  <p className="font-semibold mt-2">Total votes: {totalVotes}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Created on {new Date(poll.created_at).toLocaleDateString()}</p>
                  {(userId === poll.user_id || currentUserRole === 'admin') && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/polls/${poll.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {/* Dialog for confirming poll deletion */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => setDeletingId(poll.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {deletingId === poll.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Are you absolutely sure?</DialogTitle>
                              <DialogDescription>
                                This action cannot be undone. This will permanently delete your poll
                                and remove its data from our servers.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
                              </DialogClose>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(poll.id)}
                                disabled={isPending}
                              >
                                {isPending ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}



