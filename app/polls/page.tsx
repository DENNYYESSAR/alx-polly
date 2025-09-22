"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { FaTrash, FaEdit } from 'react-icons/fa';
import PollIcon from "@/components/shared/PollIcon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { deletePoll } from "@/lib/actions";
import PollResultsChart from "@/components/PollResultsChart";

interface Poll {
  id: string;
  question: string;
  description: string | null;
  created_at: string;
  ends_at: string | null;
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
    
    if (roleData === null) {
      // If roleData is null, no role was found for this user. This is expected for non-admin users.
      currentUserRole = null;
    } else if (roleData) {
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
  const [myPolls, setMyPolls] = useState<Poll[]>([]);
  const [publicPolls, setPublicPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // New state to force refresh

  // Helper function to calculate remaining days
  const getRemainingDays = (endsAt: string | null) => {
    if (!endsAt) return "No end date";
    const endDate = new Date(endsAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If the poll has already ended
    if (endDate < today) {
      return "Poll ended";
    }

    const diffTime = Math.abs(endDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Ends today";
    } else if (diffDays === 1) {
      return "Ends tomorrow";
    } else {
      return `Ends in ${diffDays} days`;
    }
  };

  async function fetchPolls() {
    setLoading(true);
    setError(null);

    const { user, currentUserRole } = await fetchUserAndRole();
    setUserId(user?.id || null);
    setCurrentUserRole(currentUserRole);

    let userPolls: Poll[] = [];
    let publicVisiblePolls: Poll[] = [];

    if (user) {
      // Fetch polls created by the current user
      const { data: myPollsData, error: myPollsError } = await supabase
        .from("polls")
        .select("id, question, description, created_at, ends_at, is_private, user_id, poll_options(id, option_text, votes_count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (myPollsError) {
        console.error("Error fetching user polls:", JSON.stringify(myPollsError, null, 2));
        setError("Failed to load your polls.");
      } else {
        userPolls = myPollsData as Poll[];
      }

      // Fetch public polls not created by the current user
      const { data: publicData, error: publicError } = await supabase
        .from("polls")
        .select("id, question, description, created_at, ends_at, is_private, user_id, poll_options(id, option_text, votes_count)")
        .eq("is_private", false)
        .neq("user_id", user.id) // Exclude user's own polls from public list
        .order("created_at", { ascending: false });

      if (publicError) {
        console.error("Error fetching public polls:", JSON.stringify(publicError, null, 2));
        setError((prev) => (prev ? prev + " And failed to load public polls." : "Failed to load public polls."));
      } else {
        publicVisiblePolls = publicData as Poll[];
      }
    } else {
      // If not authenticated, fetch all public polls
      const { data: publicData, error: publicError } = await supabase
        .from("polls")
        .select("id, question, description, created_at, ends_at, is_private, user_id, poll_options(id, option_text, votes_count)")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (publicError) {
        console.error("Error fetching public polls:", JSON.stringify(publicError, null, 2));
        setError("Failed to load public polls.");
      } else {
        publicVisiblePolls = publicData as Poll[];
      }
    }

    setMyPolls(userPolls);
    setPublicPolls(publicVisiblePolls);
    setLoading(false);
  }

  useEffect(() => {
    fetchPolls();
  }, [refreshKey]); // Add refreshKey to dependencies

  const handleDelete = async (pollId: string) => {
    startTransition(async () => {
      const result = await deletePoll(pollId);
      if (result.message === "Poll deleted successfully!") {
        setMyPolls(prev => prev.filter(poll => poll.id !== pollId));
        setPublicPolls(prev => prev.filter(poll => poll.id !== pollId));
        // Re-fetch all polls to ensure the UI is in sync with the database
        // Instead of calling fetchPolls directly, increment refreshKey to trigger useEffect
        setRefreshKey(prev => prev + 1);
      } else {
        setError(result.message);
      }
      setDeletingId(null);
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
      {userId && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">My Polls</h1>
          <Button asChild>
            <Link href="/create-poll">Create New Poll</Link>
          </Button>
        </div>
      )}

      {userId && myPolls.length === 0 && (
        <div className="text-center py-8 text-muted-foreground px-4">
          <p>You haven't created any polls yet.</p>
          <p>Click "Create New Poll" to get started!</p>
        </div>
      )}

      {userId && myPolls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {myPolls.map((poll, index) => {
            const totalVotes = poll.poll_options.reduce((sum, option) => sum + option.votes_count, 0);
            return (
              <Card 
                key={poll.id} 
                className="flex flex-col border-2 border-transparent hover:border-primary transition-all duration-300 ease-in-out hover:shadow-lg"
                style={{ backgroundColor: `var(--card-bg-${(index % 5) + 1})` }} // Apply dynamic background color
              >
                <CardHeader className="flex-grow space-y-2">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <Link 
                      href={`/polls/${poll.id}`}
                      className="hover:underline text-xl leading-tight font-extrabold"
                      style={{ color: `hsl(var(--text-color-${(index % 5) + 1}))` }} // Apply dynamic text color
                    >
                      {poll.question}
                    </Link>
                    <PollIcon isPrivate={poll.is_private} className="h-5 w-5 text-primary flex-shrink-0" />
                  </CardTitle>
                  {poll.description && <CardDescription className="text-base mt-1 text-muted-foreground line-clamp-2">{poll.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow text-sm text-muted-foreground space-y-1">
                  <p>{poll.poll_options.length} options</p>
                  {totalVotes > 0 ? (
                    <div className="space-y-1 mt-2">
                      {poll.poll_options.slice(0, 3).map((option) => {
                        const percentage = Math.round((option.votes_count / totalVotes) * 100);
                        return (
                          <p key={option.id}>
                            <span className="font-medium text-foreground">{option.option_text}</span>: {option.votes_count} votes ({percentage}%)
                          </p>
                        );
                      })}
                      {poll.poll_options.length > 3 && <p className="text-xs">+ {poll.poll_options.length - 3} more options</p>}
                    </div>
                  ) : (
                    <p className="mt-2">No votes yet.</p>
                  )}
                  <p className="font-semibold text-foreground pt-2">Total votes: {totalVotes}</p>
                </CardContent>
                <div className="mt-4 p-4 pt-0">
                  <PollResultsChart pollOptions={poll.poll_options} colorIndex={index} />
                </div>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-t gap-2">
                  <p className="text-xs text-muted-foreground">Created on {new Date(poll.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">{getRemainingDays(poll.ends_at)}</p>
                  {(userId === poll.user_id || currentUserRole === 'admin') && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild aria-label="Edit poll" className="hover:bg-primary/10">
                        <Link href={`/polls/${poll.id}/edit`}>
                          <FaEdit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => setDeletingId(poll.id)} aria-label="Delete poll" className="hover:bg-destructive/10">
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {deletingId === poll.id && (
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Confirm Deletion</DialogTitle>
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

      <div className="flex justify-between items-center mb-6 mt-12 border-t pt-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Public Polls</h1>
      </div>

      {publicPolls.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground px-4 border rounded-lg bg-card">
          <p className="text-lg font-medium mb-2">No public polls available at the moment.</p>
          <p>Check back later or create your own!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicPolls.map((poll, index) => {
            const totalVotes = poll.poll_options.reduce((sum, option) => sum + option.votes_count, 0);
            return (
              <Card 
                key={poll.id} 
                className="flex flex-col border-2 border-transparent hover:border-primary transition-all duration-300 ease-in-out hover:shadow-lg"
                style={{ backgroundColor: `var(--card-bg-${(index % 5) + 1})` }} // Apply dynamic background color
              >
                <CardHeader className="flex-grow space-y-2">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <Link 
                      href={`/polls/${poll.id}`}
                      className="hover:underline text-xl leading-tight font-extrabold"
                      style={{ color: `hsl(var(--text-color-${(index % 5) + 1}))` }} // Apply dynamic text color
                    >
                      {poll.question}
                    </Link>
                    <PollIcon isPrivate={poll.is_private} className="h-5 w-5 text-foreground/70 flex-shrink-0" />
                  </CardTitle>
                  {poll.description && <CardDescription className="text-base mt-1 text-foreground/80 line-clamp-2">{poll.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow text-sm space-y-1 p-4">
                  <p className="font-medium text-foreground">{poll.poll_options.length} options</p>
                  {totalVotes > 0 ? (
                    <div className="space-y-2 mt-2">
                      {poll.poll_options.slice(0, 3).map((option) => {
                        const percentage = Math.round((option.votes_count / totalVotes) * 100);
                        return (
                          <div key={option.id} className="flex items-center justify-between p-2 rounded-md bg-foreground/5">
                            <span className="font-medium text-foreground">{option.option_text}</span>
                            <span className="text-sm text-foreground/70">{option.votes_count} votes ({percentage}%)</span>
                          </div>
                        );
                      })}
                      {poll.poll_options.length > 3 && <p className="text-xs pt-1 text-foreground/70">+ {poll.poll_options.length - 3} more options</p>}
                    </div>
                  ) : (
                    <p className="mt-2 p-2 rounded-md bg-foreground/5 text-foreground/70">No votes yet.</p>
                  )}
                  <p className="font-semibold text-foreground pt-3">Total votes: {totalVotes}</p>
                </CardContent>
                <div className="mt-4 p-4 pt-0">
                  <PollResultsChart pollOptions={poll.poll_options} colorIndex={index} />
                </div>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-t gap-2 pt-4">
                  <p className="text-xs text-foreground/70">Created on {new Date(poll.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-foreground/70">{getRemainingDays(poll.ends_at)}</p>
                  {(userId === poll.user_id || currentUserRole === 'admin') && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild aria-label="Edit poll" className="hover:bg-primary/10">
                        <Link href={`/polls/${poll.id}/edit`}>
                          <FaEdit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="icon" onClick={() => setDeletingId(poll.id)} aria-label="Delete poll" className="hover:bg-destructive/10">
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {deletingId === poll.id && (
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Confirm Deletion</DialogTitle>
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



