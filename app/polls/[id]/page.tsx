import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";

export default function ViewPollPage({ params }: { params: { id: string } }) {
  // Placeholder poll data
  const poll = {
    id: params.id,
    question: "Favorite Programming Language",
    options: [
      { id: "1", text: "JavaScript" },
      { id: "2", text: "Python" },
      { id: "3", text: "Java" },
      { id: "4", text: "C#" },
      { id: "5", text: "Go" },
    ],
    createdBy: "John Doe",
    createdOn: "10/10/2023",
  };

  return (
    <div className="space-y-6">
      <Button variant="link" asChild className="pl-0">
        <Link href="/polls" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Polls
        </Link>
      </Button>

      <h1 className="text-3xl font-bold">{poll.question}</h1>

      <RadioGroup defaultValue="option-1" className="space-y-4">
        {poll.options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.id} id={`option-${option.id}`} />
            <Label htmlFor={`option-${option.id}`} className="text-lg">{option.text}</Label>
          </div>
        ))}
      </RadioGroup>

      <Button type="submit">Submit Vote</Button>

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <p>Created by {poll.createdBy}</p>
        <p>Created on {poll.createdOn}</p>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h2 className="text-xl font-bold">Share this poll</h2>
        <div className="flex gap-4">
          <Button variant="outline">Copy Link</Button>
          <Button variant="outline">Share on Twitter</Button>
        </div>
      </div>
    </div>
  );
}
