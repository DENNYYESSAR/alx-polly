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
  poll_options: { votes_count: number }[];
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    async function fetchPolls() {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("polls")
        .select("id, question, description, created_at, is_private, poll_options(votes_count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching polls:", JSON.stringify(error, null, 2));
        setError("Failed to load polls.");
      } else {
        setPolls(data as Poll[]);
      }
      setLoading(false);
    }

    fetchPolls();
  }, [router]);

  const handleDelete = async (pollId: string) => {
    startTransition(async () => {
      const result = await deletePoll(pollId);
      if (result.message === "Poll deleted successfully!") {
        setPolls(polls.filter(poll => poll.id !== pollId));
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Button asChild>
          <Link href="/create-poll">Create New Poll</Link>
        </Button>
      </div>

      {error && <p className="text-center text-red-500">Error: {error}</p>}

      {polls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>You haven't created any polls yet.</p>
          <p>Click "Create New Poll" to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => {
            const totalVotes = poll.poll_options.reduce((sum, option) => sum + option.votes_count, 0);
            return (
              <Card key={poll.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link href={`/polls/${poll.id}`} className="hover:underline">
                      {poll.question}
                    </Link>
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
                  <p>{totalVotes} total votes</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Created on {new Date(poll.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" asChild>
                      <Link href={`/polls/${poll.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
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
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}



