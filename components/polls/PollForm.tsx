import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PollForm() {
  return (
    <form className="space-y-4">
      <Input type="text" placeholder="Poll Question" />
      <Textarea placeholder="Options (one per line)" />
      <Button type="submit">Create Poll</Button>
    </form>
  );
}



