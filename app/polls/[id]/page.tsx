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

interface PollOption {
  id: string;
  option_text: string;
  votes_count: number;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  created_at: string;
  user_id: string;
  creator_username: string; // Add creator_username to the interface
  allow_multiple_options: boolean;
  is_private: boolean;
  poll_options: PollOption[];
}

export default function ViewPollPage({ params }: { params: Promise<{ id: string }> }) {
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

  useEffect(() => {
    async function fetchPoll() {
      setLoading(true);
      setError(null);
      setMessage(null);

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
          poll_options(
            id,
            option_text,
            votes_count
          ),
          profiles(username) // Join with profiles table to get username
        `
        )
        .eq("id", pollId)
        .single();

      if (error) {
        console.error("Error fetching poll:", error);
        setError("Failed to load poll.");
      } else {
        const pollData = data as any; // Use any for initial data to handle nested profiles object
        setPoll({
          ...pollData,
          creator_username: pollData.profiles?.username || "Unknown User",
        });
      }
      setLoading(false);
    }

    fetchPoll();
  }, [pollId]);

  const handleCopyLink = (pollId: string) => {
    const pollUrl = `${window.location.origin}/polls/${pollId}`;
    navigator.clipboard.writeText(pollUrl).then(() => {
      setCopyFeedback("Link copied!");
      setTimeout(() => setCopyFeedback(null), 3000); // Clear feedback after 3 seconds
    }).catch(() => {
      setCopyFeedback("Failed to copy link.");
      setTimeout(() => setCopyFeedback(null), 3000); // Clear feedback after 3 seconds
    });
  };

  const handleShareOnTwitter = (pollId: string) => {
    const pollUrl = `${window.location.origin}/polls/${pollId}`;
    const tweetText = encodeURIComponent(`Vote on my poll: ${poll?.question || ""}`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(pollUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleSubmitVote = async () => {
    if (!selectedOption) {
      setMessage("Please select an option to vote.");
      return;
    }

    startTransition(async () => {
      const result = await submitVote(poll!.id, selectedOption);
      setMessage(result.message);
      if (result.message === "Vote submitted successfully!") {
        // Optionally, re-fetch poll data to show updated results immediately
        // The revalidatePath in the server action should handle this, but can be explicit if needed
        // fetchPoll(); // This would require moving fetchPoll outside useEffect or using useCallback
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
    <div className="space-y-6">
      <Button variant="link" asChild className="pl-0">
        <Link href="/polls" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Polls
        </Link>
      </Button>

      <h1 className="text-3xl font-bold flex items-center gap-2">
        {poll.question}
        {poll.is_private ? (
          <Lock className="h-6 w-6 text-muted-foreground" title="Private Poll" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground" title="Public Poll"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        )}
      </h1>
      {poll.description && <p className="text-muted-foreground">{poll.description}</p>}

      <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-4">
        {poll.poll_options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.id} id={`option-${option.id}`} />
            <Label htmlFor={`option-${option.id}`} className="text-lg">{option.option_text}</Label>
          </div>
        ))}
      </RadioGroup>

      <Button onClick={handleSubmitVote} disabled={!selectedOption || isPending}>
        {isPending ? "Submitting..." : "Submit Vote"}
      </Button>
      {message && <p className="mt-4 text-center text-sm font-medium text-green-600">{message}</p>}

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>Created by {poll.creator_username}</p>
        <p>Created on {new Date(poll.created_at).toLocaleDateString()}</p>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h2 className="text-xl font-bold">Share this poll</h2>
        <div className="flex flex-col items-center gap-4">
          <QRCodeShare url={`${window.location.origin}/polls/${poll.id}`} pollId={poll.id} />
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => handleCopyLink(pollId)}>Copy Link</Button>
            <Button variant="outline" onClick={() => handleShareOnTwitter(pollId)}>Share on Twitter</Button>
          </div>
          {copyFeedback && <p className="text-sm text-green-600">{copyFeedback}</p>}
        </div>
      </div>
    </div>
  );
}
