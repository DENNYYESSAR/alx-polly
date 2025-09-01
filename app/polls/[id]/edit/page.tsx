"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { updatePoll, updatePollSettings } from "@/lib/actions"; // We will create this action later
import React from 'react';

interface PollOption {
  id: string;
  option_text: string;
}

interface PollData {
  id: string;
  question: string;
  description: string | null;
  allow_multiple_options: boolean;
  is_private: boolean;
  poll_options: PollOption[];
}

export default function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const pollId = resolvedParams.id;
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<PollOption[]>([]);
  const [allowMultipleOptions, setAllowMultipleOptions] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchPoll() {
      setLoading(true);
      setError(null);
      setMessage("");

      const { data, error } = await supabase
        .from("polls")
        .select(
          `
          id,
          question,
          description,
          allow_multiple_options,
          is_private,
          poll_options(
            id,
            option_text
          )
        `
        )
        .eq("id", pollId)
        .single();

      if (error) {
        console.error("Error fetching poll for editing:", error);
        setError("Failed to load poll for editing.");
      } else if (data) {
        setPoll(data as PollData);
        setQuestion(data.question);
        setDescription(data.description || "");
        setOptions(data.poll_options);
        setAllowMultipleOptions(data.allow_multiple_options);
        setIsPrivate(data.is_private);
      }
      setLoading(false);
    }

    fetchPoll();
  }, [pollId]);

  const handleAddOption = () => {
    setOptions([...options, { id: `new-${options.length}`, option_text: "" }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].option_text = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (formData: FormData) => {
    if (!poll) return; // Should not happen if poll is loaded

    const updatedOptions = options.map(option => option.option_text);
    formData.append("id", poll.id);
    formData.append("options_json", JSON.stringify(updatedOptions));

    startTransition(async () => {
      const result = await updatePoll(formData);
      setMessage(result.message);
      if (result.message === "Poll updated successfully!") {
        router.push("/polls");
      }
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading poll for editing...</div>;
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

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Poll</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/polls">Cancel</Link>
          </Button>
          <Button type="submit" form="edit-poll-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="basic-info">
          <Card>
            <CardHeader>
              <CardTitle>Poll Information</CardTitle>
              <CardDescription>Update the details for your poll</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form id="edit-poll-form" action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Poll Title</Label>
                  <Input
                    id="question"
                    name="question"
                    placeholder="Enter a question or title"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Provide more context about your poll"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poll-options">Poll Options</Label>
                  {options.map((option, index) => (
                    <div key={option.id || `new-${index}`} className="flex items-center space-x-2">
                      <Input
                        id={`option-${index}`}
                        name="option"
                        placeholder={`Option ${index + 1}`}
                        value={option.option_text}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        required
                      />
                      {options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddOption} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="edit-poll-form" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Poll Settings</CardTitle>
              <CardDescription>Configure additional options for your poll</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form id="edit-poll-settings-form" action={async (formData) => {
                formData.append("id", poll.id);
                startTransition(async () => {
                  const result = await updatePollSettings(formData);
                  setMessage(result.message);
                  if (result.message === "Poll settings updated successfully!") {
                    // Re-fetch poll data to update the UI
                    // This ensures checkboxes reflect the saved state
                    async function refreshPoll() {
                      const { data, error } = await supabase
                        .from("polls")
                        .select(
                          `
                          id,
                          question,
                          description,
                          allow_multiple_options,
                          is_private,
                          poll_options(
                            id,
                            option_text
                          )
                        `
                        )
                        .eq("id", poll.id)
                        .single();

                      if (error) {
                        console.error("Error re-fetching poll after settings update:", error);
                        setError("Failed to refresh poll data.");
                      } else if (data) {
                        setPoll(data as PollData);
                        setAllowMultipleOptions(data.allow_multiple_options);
                        setIsPrivate(data.is_private);
                      }
                    }
                    refreshPoll();
                  }
                });
              }} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowMultipleOptions"
                    name="allowMultipleOptions"
                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    checked={allowMultipleOptions}
                    onChange={(e) => setAllowMultipleOptions(e.target.checked)}
                  />
                  <Label
                    htmlFor="allowMultipleOptions"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Allow users to select multiple options
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    name="isPrivate"
                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <Label
                    htmlFor="isPrivate"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Make this poll private (only accessible via direct link)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poll-end-date">Poll End Date (Optional)</Label>
                  <Input id="poll-end-date" type="date" placeholder="dd/mm/yyyy --:--" />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="edit-poll-settings-form" disabled={isPending}>
                {isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      {message && <p className="mt-4 text-center text-sm font-medium text-red-500">{message}</p>}
    </div>
  );
}
