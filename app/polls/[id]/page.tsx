"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { submitVote } from "@/lib/actions";
import React from 'react';
import { Lock } from "lucide-react";
import QRCodeShare from "@/components/polls/QRCodeShare";
import PollResultsChart from "@/components/PollResultsChart";
import PollComments from "@/components/PollComments";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HiChevronLeft } from "react-icons/hi";
import PollIcon from "@/components/shared/PollIcon";

interface PollOption {
  id: string;
  option_text: string;
  votes_count: number;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  allow_multiple_options: boolean;
  is_private: boolean;
  allow_unauthenticated_votes: boolean;
  created_at: string;
  user_id: string;
  creator_username: string | null;
  poll_options: { id: string; option_text: string; votes_count: number }[];
  comments: Comment[];
}

interface Comment {
  id: string;
  user_id: string | null;
  user_email: string | null;
  content: string;
  created_at: string;
}

export default function ViewPollPage({ params }: { params: Promise<{ id: string }> }) {
  /**
   * @doc ViewPollPage component displays a single poll with its details, options, and voting mechanism.
   * This component fetches a specific poll by its ID, handles user authentication, allows users to submit votes,
   * and provides options to share the poll via link or QR code. It also displays poll creator information and privacy status.
   *
   * @param {{ params: Promise<{ id: string }> }} props - The component props containing the poll ID.
   * @returns {JSX.Element} A React component that renders the detailed view of a poll.
   */
  const resolvedParams = React.use(params);
  const pollId = resolvedParams.id;
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  async function fetchPoll() {
    console.log("fetchPoll: Starting data fetch for pollId:", pollId); // Debug log
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);

    if (user) {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData === null) {
        // If roleData is null, no role was found for this user. This is expected for non-admin users.
        setCurrentUserRole(null);
      } else if (roleData) {
        setCurrentUserRole(roleData.role);
      } else if (roleError) {
        // Only log a console error if there's an actual error beyond "no rows found"
        console.error("Error fetching user role:", roleError);
        setCurrentUserRole(null);
      }
    }

    // Fetch poll data, including options and creator's username
    const { data, error } = await supabase
      .from("polls")
      .select(
        `
        id,
        question,
        description,
        created_at,
        user_id,
        allow_multiple_options,
        is_private,
        allow_unauthenticated_votes,
        poll_options(
          id,
          option_text,
          votes_count
        ),
        comments(id, user_id, content, created_at),
        profiles(username) // Join with profiles table to get username
      `
      )
      .eq("id", pollId)
      .single();

    if (error) {
      console.error("fetchPoll: Error fetching poll:", JSON.stringify(error, null, 2));
      setError("Failed to load poll.");
    } else {
      console.log("fetchPoll: Data received:", data); // Debug log
      // Map fetched data to Poll interface, extracting creator_username
      const pollData = data as any; // Use any for initial data to handle nested profiles object
      setPoll({
        ...pollData,
        creator_username: pollData.profiles?.username || "Unknown User",
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPoll();
  }, [pollId]); // Re-run effect if pollId changes

  const handleCopyLink = (pollId: string) => {
    // Construct the full URL for the poll
    const pollUrl = `${window.location.origin}/polls/${pollId}`;
    // Copy the URL to the clipboard
    navigator.clipboard.writeText(pollUrl).then(() => {
      setCopyFeedback("Link copied!");
      // Clear feedback after 3 seconds
      setTimeout(() => setCopyFeedback(null), 3000);
    }).catch(() => {
      setCopyFeedback("Failed to copy link.");
      // Clear feedback after 3 seconds
      setTimeout(() => setCopyFeedback(null), 3000);
    });
  };

  const handleShareOnTwitter = (pollId: string) => {
    // Construct the full URL for the poll
    const pollUrl = `${window.location.origin}/polls/${pollId}`;
    // Encode tweet text and URL for Twitter Web Intent
    const tweetText = encodeURIComponent(`Vote on my poll: ${poll?.question || ""}`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(pollUrl)}`;
    // Open Twitter Web Intent in a new window
    window.open(twitterUrl, '_blank');
  };

  const handleSubmitVote = async () => {
    // Ensure an option is selected before submitting a vote
    if (!selectedOption) {
      setMessage("Please select an option to vote.");
      return;
    }

    // Use startTransition for non-blocking UI updates during vote submission
    startTransition(async () => {
      // Call the server action to submit the vote
      const result = await submitVote(poll!.id, selectedOption);
      setMessage(result.message);
      if (result.message === "Vote submitted successfully!") {
        await fetchPoll(); // Re-fetch poll data to show updated results
        console.log("handleSubmitVote: Poll state after fetchPoll:", poll); // Debug log
        router.refresh(); // Still call router.refresh() for good measure, though fetchPoll should handle direct state update
      }
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading poll...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!poll) {
    return <div className="text-center py-8 text-muted-foreground">Poll not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <Button variant="link" asChild className="pl-0 text-muted-foreground hover:text-primary transition-colors">
        <Link href="/polls" className="flex items-center gap-1">
          <HiChevronLeft className="h-4 w-4" />
          Back to Polls
        </Link>
      </Button>

      <Card className="bg-card text-card-foreground shadow-lg">
        <CardHeader className="space-y-4 pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-3xl sm:text-4xl font-bold leading-tight flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {poll.question}
              <PollIcon isPrivate={poll.is_private} className="h-6 w-6 text-primary flex-shrink-0" />
            </CardTitle>
            {(currentUserId === poll.user_id || currentUserRole === 'admin') && (
              <Button asChild aria-label="Edit poll" className="ml-auto">
                <Link href={`/polls/${poll.id}/edit`}>
                  Edit Poll
                </Link>
              </Button>
            )}
          </div>
          {poll.description && <CardDescription className="text-base text-muted-foreground">{poll.description}</CardDescription>}
        </CardHeader>

        <CardContent className="pt-6 pb-4 space-y-6">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-4">
            {poll.poll_options.map((option) => {
              const totalVotes = poll.poll_options.reduce((sum, opt) => sum + opt.votes_count, 0);
              const percentage = totalVotes === 0 ? 0 : Math.round((option.votes_count / totalVotes) * 100);
              return (
                <Label
                  key={option.id}
                  htmlFor={`option-${option.id}`}
                  className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={option.id} id={`option-${option.id}`} className="shrink-0" />
                  <span className="flex-grow text-lg font-medium">{option.option_text}</span>
                  <span className="text-sm text-muted-foreground">{option.votes_count} votes ({percentage}%)</span>
                </Label>
              );
            })}
          </RadioGroup>

          <Button onClick={handleSubmitVote} disabled={!selectedOption || isPending} className="w-full mt-4">
            {isPending ? "Submitting..." : "Submit Vote"}
          </Button>
          {message && <p className="mt-4 text-center text-sm font-medium text-green-600">{message}</p>}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-muted-foreground pt-4 border-t gap-2">
          <p className="text-sm">Created by <span className="font-semibold text-foreground">{poll.creator_username}</span></p>
          <p className="text-sm">Created on {new Date(poll.created_at).toLocaleDateString()}</p>
        </CardFooter>
      </Card>

      {poll && (
        <Card className="mt-8 bg-card text-card-foreground shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Poll Results</CardTitle>
          </CardHeader>
          <CardContent>
            <PollResultsChart pollOptions={poll.poll_options} />
          </CardContent>
        </Card>
      )}

      {poll && (
        <Card className="mt-8 bg-card text-card-foreground shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <PollComments pollId={poll.id} initialComments={poll.comments} />
          </CardContent>
        </Card>
      )}

      <Card className="border-t pt-6 space-y-4 bg-card text-card-foreground shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Share this poll</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <QRCodeShare url={`${window.location.origin}/polls/${poll.id}`} pollId={poll.id} />
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button variant="outline" onClick={() => handleCopyLink(pollId)} className="w-full sm:w-auto flex-grow" aria-label="Copy poll link">Copy Link</Button>
            <Button variant="outline" onClick={() => handleShareOnTwitter(pollId)} className="w-full sm:w-auto flex-grow" aria-label="Share poll on Twitter">Share on Twitter</Button>
          </div>
          {copyFeedback && <p className="text-sm text-green-600">{copyFeedback}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
