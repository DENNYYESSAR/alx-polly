import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from 'react';
import { createPoll } from "@/lib/actions";

export default function PollForm() {
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const options = optionsText.split('\n').map(option => option.trim()).filter(option => option !== '');

    if (!question.trim()) {
      setError("Poll question cannot be empty.");
      setIsSubmitting(false);
      return;
    }

    if (options.length === 0) {
      setError("Please provide at least one poll option.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("question", question);
    formData.append("description", ""); // Add an empty description for now
    options.forEach((option, index) => {
      formData.append(`option-${index}`, option);
    });

    const result = await createPoll(formData);

    if (result.message) {
      setError(result.message);
    } else {
      // Optionally clear form or redirect on success
      setQuestion("");
      setOptionsText("");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Poll Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
      />
      <Textarea
        placeholder="Options (one per line)"
        value={optionsText}
        onChange={(e) => setOptionsText(e.target.value)}
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating Poll..." : "Create Poll"}
      </Button>
    </form>
  );
}



