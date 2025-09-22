'use client';

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthStatusClientComponent";
import { submitComment } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Comment {
  id: string;
  user_id: string | null;
  user_email: string | null; // This will be used if we can fetch user emails
  content: string;
  created_at: string;
}

interface PollCommentsProps {
  pollId: string;
  initialComments: Comment[];
}

export default function PollComments({ pollId, initialComments }: PollCommentsProps) {
  const { isAuthenticated, userId, session } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // This effect would re-fetch comments if pollId changes, but given the current architecture
  // and how initialComments is passed, it might not be strictly necessary if comments are
  // always provided up-to-date from the parent Server Component.
  // However, keeping it for completeness if dynamic comment loading were introduced.
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    if (!isAuthenticated || !userId) {
      setError("You must be logged in to comment.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        // The server action will revalidate the path, causing a refresh
        // of the parent component which will then pass updated comments.
        await submitComment(pollId, userId, newComment);
        setNewComment("");
        // After submission, rely on parent component's revalidation and re-fetch to update comments state
      } catch (err) {
        console.error("Failed to submit comment:", err);
        setError("Failed to submit comment.");
      }
    });
  };

  // Helper to get initials for avatar fallback
  const getInitials = (email: string | null) => {
    if (!email) return "U"; // Unknown user
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {comments.length === 0 && <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-4">
            <Avatar>
              <AvatarFallback>{getInitials(comment.user_email)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold">{comment.user_email || "Anonymous"}</p>
                <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="flex items-start space-x-4 mt-6">
          <Avatar>
            <AvatarFallback>{session?.user?.email ? getInitials(session.user.email) : "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-grow space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isPending}
              rows={3}
              className="resize-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" disabled={isPending || !newComment.trim()}>
              {isPending ? "Submitting..." : "Post Comment"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-center mt-6">Please <Link href="/auth" className="text-primary hover:underline">log in</Link> to leave a comment.</p>
      )}
    </div>
  );
}
