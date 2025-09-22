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
import { FaTrash } from 'react-icons/fa'; // Import the trash icon
import { deleteComment } from '@/lib/actions'; // Import the deleteComment action

interface Comment {
  id: string;
  user_id: string | null;
  user_email: string | null; // This will be used if we can fetch user emails
  content: string;
  created_at: string;
  profiles?: { first_name: string | null } | null; // Add profiles with first_name
}

interface PollCommentsProps {
  pollId: string;
  initialComments: Comment[];
  onCommentDeleted: () => void; // New callback prop
}

export default function PollComments({ pollId, initialComments, onCommentDeleted }: PollCommentsProps) {
  const { isAuthenticated, userId, session, currentUserRole } = useAuth(); // Get currentUserRole
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        // Call the server action and get the returned comment data
        const newCommentData = await submitComment(pollId, userId, newComment);

        // Optimistically update the UI with the new comment, including the first_name and user_email
        setComments(currentComments => [
          { 
            ...newCommentData,
            user_email: newCommentData.user_email || session?.user?.email || null, // Ensure user_email is present
            profiles: newCommentData.profiles // Ensure profiles is included
          } as Comment, // Assert to Comment type
          ...currentComments
        ]);
        setNewComment("");
      } catch (err) {
        console.error("Failed to submit comment:", err);
        setError("Failed to submit comment.");
      }
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    // Ask for confirmation before deleting
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteComment(commentId, pollId);
        if (result.message === "Comment deleted successfully!") {
          // Optimistically update the UI
          setComments(currentComments => currentComments.filter(comment => comment.id !== commentId));
          onCommentDeleted(); // Call the callback after successful deletion
        }
        alert(result.message);
      } catch (err) {
        console.error("Failed to delete comment:", err);
        alert("Failed to delete comment.");
      }
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {comments.length === 0 && <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-4">
            <Avatar>
              <AvatarFallback>{comment.profiles?.first_name ? getInitials(comment.profiles.first_name) : "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold">{comment.profiles?.first_name || "Anonymous"}</p>
                <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
                {(userId === comment.user_id || currentUserRole === 'admin') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isPending}
                  >
                    <FaTrash className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="flex items-start space-x-4 mt-6">
          <Avatar>
            <AvatarFallback>{session?.user?.user_metadata?.first_name ? getInitials(session.user.user_metadata.first_name as string) : "U"}</AvatarFallback>
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
