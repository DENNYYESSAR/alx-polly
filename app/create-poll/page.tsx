"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { createPoll } from "@/lib/actions";

export default function CreatePollPage() {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultipleOptions, setAllowMultipleOptions] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null); // New state for end date
  const [allowUnauthenticatedVotes, setAllowUnauthenticatedVotes] = useState(false); // New state for unauthenticated votes
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create New Poll</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/polls">Cancel</Link>
          </Button>
          <Button type="submit" form="create-poll-form" disabled={isPending}>
            {isPending ? "Creating..." : "Create Poll"}
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
              <CardDescription>Enter the details for your new poll</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                id="create-poll-form"
                action={async (formData) => {
                  setMessage("");
                  // Append settings from state to formData for the server action.
                  // These must be set here because client-side state is not directly accessible in the server action.
                  formData.set("allowMultipleOptions", allowMultipleOptions ? "on" : "off");
                  formData.set("isPrivate", isPrivate ? "on" : "off");
                  formData.set("allowUnauthenticatedVotes", allowUnauthenticatedVotes ? "on" : "off"); // Set new field
                  if (endsAt) {
                    formData.set("endsAt", endsAt);
                  }
                  // Append poll options to formData. The createPoll server action will handle parsing.
                  // Ensure all options, even empty ones, are passed for consistent indexing.
                  options.forEach((optionText, index) => {
                    formData.set(`option-${index}`, optionText);
                  });

                  startTransition(async () => {
                    const result = await createPoll(formData);
                    setMessage(result.message);
                    // The redirect is handled by the server action itself for now (within createPoll).
                  });
                }}
                className="space-y-4"
              >
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
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        id={`option-${index}`}
                        name="option"
                        placeholder={`Option ${index + 1}`}
                        value={option}
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
                <div className="space-y-2">
                  <Label htmlFor="poll-end-date">Poll End Date (Optional)</Label>
                  <Input
                    id="poll-end-date"
                    type="date"
                    name="endsAt"
                    value={endsAt || ""}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="create-poll-form" disabled={isPending}>
                {isPending ? "Creating..." : "Create Poll"}
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
              <form id="create-poll-settings-form" className="space-y-4">
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
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowUnauthenticatedVotes"
                    name="allowUnauthenticatedVotes"
                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    checked={allowUnauthenticatedVotes}
                    onChange={(e) => setAllowUnauthenticatedVotes(e.target.checked)}
                  />
                  <Label
                    htmlFor="allowUnauthenticatedVotes"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Allow unauthenticated users to vote (no login required)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poll-end-date">Poll End Date (Optional)</Label>
                  <Input
                    id="poll-end-date"
                    type="date"
                    name="endsAt"
                    value={endsAt || ""}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="create-poll-form" disabled={isPending}>
                {isPending ? "Creating..." : "Create Poll"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      {message && <p className="mt-4 text-center text-sm font-medium text-red-500">{message}</p>}
    </div>
  );
}
