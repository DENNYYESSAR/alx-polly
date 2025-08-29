import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function PollsPage() {
  // Placeholder data for polls
  const polls = [
    {
      id: "1",
      title: "Favorite Programming Language",
      description: "What programming language do you prefer to use?",
      options: 5,
      totalVotes: 47,
      createdDate: "10/10/2023",
    },
    {
      id: "2",
      title: "Best Frontend Framework",
      description: "Which frontend framework do you think is the best?",
      options: 4,
      totalVotes: 58,
      createdDate: "10/10/2023",
    },
    {
      id: "3",
      title: "Preferred Database",
      description: "What database do you prefer to work with?",
      options: 3,
      totalVotes: 27,
      createdDate: "10/10/2023",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Button asChild>
          <Link href="/create-poll">Create New Poll</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => (
          <Card key={poll.id}>
            <CardHeader>
              <CardTitle>{poll.title}</CardTitle>
              <CardDescription>{poll.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{poll.options} options</p>
              <p>{poll.totalVotes} total votes</p>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">Created on {poll.createdDate}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}



