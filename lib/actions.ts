'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

interface CreatePollFormState {
  message: string;
}

export async function createPoll(formData: FormData): Promise<CreatePollFormState> {
  const question = formData.get("question") as string;
  const description = formData.get("description") as string;
  const options = [];
  for (let i = 0; formData.has(`option-${i}`); i++) {
    options.push(formData.get(`option-${i}`) as string);
  }
  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";
  const endsAtString = formData.get("endsAt") as string;
  const endsAt = endsAtString ? new Date(endsAtString).toISOString() : null;

  const cookieStore = await cookies();
  console.log("createPoll Server Action: All cookies", cookieStore.getAll());
  const supabaseAuthCookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split(".")[0].split("//")[1]}-auth-token`;
  const supabaseAuthCookie = cookieStore.get(supabaseAuthCookieName);
  console.log(`createPoll Server Action: Supabase Auth Cookie (${supabaseAuthCookieName})`, supabaseAuthCookie);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("createPoll Server Action: User data", user, "Error", userError);

  if (!user) {
    return { message: "User not authenticated." };
  }

  if (!question || options.length === 0 || options.some(option => !option.trim())) {
    return { message: "Please provide a question and at least one non-empty option." };
  }

  // Insert poll into the database
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      user_id: user.id,
      question,
      description,
      allow_multiple_options: allowMultipleOptions,
      is_private: isPrivate,
      ends_at: endsAt,
    })
    .select()
    .single();

  if (pollError || !poll) {
    console.error("Error creating poll:", pollError);
    return { message: "Failed to create poll." };
  }

  // Insert poll options into the database
  const pollOptionsData = options.map((optionText) => ({
    poll_id: poll.id,
    option_text: optionText,
  }));

  const { error: optionsError } = await supabase.from("poll_options").insert(pollOptionsData);

  if (optionsError) {
    console.error("Error creating poll options:", optionsError);
    // Consider deleting the poll if options creation fails
    await supabase.from("polls").delete().eq("id", poll.id);
    return { message: "Failed to create poll options." };
  }

  revalidatePath("/polls");
  redirect("/polls");
}

interface VoteFormState {
  message: string;
}

export async function submitVote(pollId: string, optionId: string): Promise<VoteFormState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated." };
  }

  // Check if the user has already voted on this poll (simple check, can be improved)
  const { data: existingVote, error: existingVoteError } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", user.id)
    .eq("poll_id", pollId)
    .single();

  if (existingVoteError && existingVoteError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error checking existing vote:", existingVoteError);
    return { message: "Error checking vote status." };
  }

  if (existingVote) {
    return { message: "You have already voted on this poll." };
  }

  // Increment vote count for the selected option
  const { error: updateError } = await supabase.rpc('increment_vote', { option_id: optionId });

  if (updateError) {
    console.error("Error updating vote count:", updateError);
    return { message: "Failed to submit vote." };
  }

  // Record the user's vote to prevent multiple votes
  const { error: recordError } = await supabase.from("votes").insert({
    user_id: user.id,
    poll_id: pollId,
    poll_option_id: optionId,
  });

  if (recordError) {
    console.error("Error recording vote:", recordError);
    return { message: "Failed to record vote." };
  }

  revalidatePath(`/polls/${pollId}`);
  return { message: "Vote submitted successfully!" };
}

interface UpdatePollFormState {
  message: string;
}

export async function updatePoll(formData: FormData): Promise<UpdatePollFormState> {
  const pollId = formData.get("id") as string;
  const question = formData.get("question") as string;
  const description = formData.get("description") as string;
  const optionsJson = formData.get("options_json") as string;
  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";

  const options = JSON.parse(optionsJson) as string[];

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated." };
  }

  if (!pollId) {
    return { message: "Poll ID is missing." };
  }

  if (!question || options.length === 0 || options.some(option => !option.trim())) {
    return { message: "Please provide a question and at least one non-empty option." };
  }

  // Update poll details
  const { error: pollUpdateError } = await supabase
    .from("polls")
    .update({
      question,
      description,
      allow_multiple_options: allowMultipleOptions,
      is_private: isPrivate,
    })
    .eq("id", pollId)
    .eq("user_id", user.id); // Ensure only the owner can update

  if (pollUpdateError) {
    console.error("Error updating poll:", pollUpdateError);
    return { message: "Failed to update poll." };
  }

  // Fetch existing options to determine what to update, insert, or delete
  const { data: existingOptions, error: fetchOptionsError } = await supabase
    .from("poll_options")
    .select("id, option_text")
    .eq("poll_id", pollId);

  if (fetchOptionsError) {
    console.error("Error fetching existing poll options:", fetchOptionsError);
    return { message: "Failed to update poll options." };
  }

  const existingOptionTexts = new Set(existingOptions.map(opt => opt.option_text));
  const newOptionTexts = new Set(options);

  // Options to delete
  const optionsToDelete = existingOptions.filter(opt => !newOptionTexts.has(opt.option_text));
  if (optionsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("poll_options")
      .delete()
      .in("id", optionsToDelete.map(opt => opt.id));
    if (deleteError) {
      console.error("Error deleting old options:", deleteError);
      return { message: "Failed to update poll options." };
    }
  }

  // Options to insert
  const optionsToInsert = options.filter(optText => !existingOptionTexts.has(optText));
  if (optionsToInsert.length > 0) {
    const insertData = optionsToInsert.map(text => ({ poll_id: pollId, option_text: text }));
    const { error: insertError } = await supabase
      .from("poll_options")
      .insert(insertData);
    if (insertError) {
      console.error("Error inserting new options:", insertError);
      return { message: "Failed to update poll options." };
    }
  }

  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/polls");
  return { message: "Poll updated successfully!" };
}

interface UpdatePollSettingsFormState {
  message: string;
}

export async function updatePollSettings(formData: FormData): Promise<UpdatePollSettingsFormState> {
  const pollId = formData.get("id") as string;
  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated." };
  }

  if (!pollId) {
    return { message: "Poll ID is missing." };
  }

  const { error: settingsUpdateError } = await supabase
    .from("polls")
    .update({
      allow_multiple_options: allowMultipleOptions,
      is_private: isPrivate,
    })
    .eq("id", pollId)
    .eq("user_id", user.id); // Ensure only the owner can update

  if (settingsUpdateError) {
    console.error("Error updating poll settings:", settingsUpdateError);
    return { message: "Failed to update poll settings." };
  }

  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/polls");
  return { message: "Poll settings updated successfully!" };
}

interface DeletePollFormState {
  message: string;
}

export async function deletePoll(pollId: string): Promise<DeletePollFormState> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated." };
  }

  if (!pollId) {
    return { message: "Poll ID is missing." };
  }

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", user.id); // Ensure only the owner can delete

  if (error) {
    console.error("Error deleting poll:", error);
    return { message: "Failed to delete poll." };
  }

  revalidatePath("/polls");
  return { message: "Poll deleted successfully!" };
}

interface ForgotPasswordFormState {
  message: string;
}

export async function sendPasswordResetEmail(email: string): Promise<ForgotPasswordFormState> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const store = await cookieStore;
          return store.get(name)?.value;
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          const store = await cookieStore;
          store.set({ name, value, ...options });
        },
        remove(name: string) {
          cookieStore.delete(name);
        },
      },
    }
  );

  // IMPORTANT: Ensure NEXT_PUBLIC_SITE_URL is set in your .env.local
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("Error sending password reset email:", error.message);
    return { message: error.message };
  }

  return { message: "Password reset email sent. Check your inbox!" };
}

interface UpdatePasswordFormState {
  message: string;
}

export async function updatePassword(newPassword: string): Promise<UpdatePasswordFormState> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string) {
          cookieStore.delete(name);
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (userError) {
    console.error("Error updating password:", userError.message);
    return { message: userError.message };
  }

  if (!user) {
    return { message: "Failed to update password. User not found in session." };
  }

  return { message: "Your password has been reset successfully!" };
}
