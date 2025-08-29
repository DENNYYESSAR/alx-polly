import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreatePollPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create New Poll</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/polls">Cancel</Link>
          </Button>
          <Button>Create Poll</Button>
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
              <div className="space-y-2">
                <Label htmlFor="poll-title">Poll Title</Label>
                <Input id="poll-title" placeholder="Enter a question or title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-description">Description (Optional)</Label>
                <Textarea id="poll-description" placeholder="Provide more context about your poll" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-options">Poll Options</Label>
                <Input id="option-1" placeholder="Option 1" />
                <Input id="option-2" placeholder="Option 2" />
                <Button variant="outline" className="mt-2">Add Option</Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Create Poll</Button>
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
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="multiple-selection" className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                <Label
                  htmlFor="multiple-selection"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Allow users to select multiple opinions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="login-required" className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                <Label
                  htmlFor="login-required"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Require users to be logged in to vote
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-end-date">Poll End Date (Optional)</Label>
                <Input id="poll-end-date" type="date" placeholder="dd/mm/yyyy --:--" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Create Poll</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
