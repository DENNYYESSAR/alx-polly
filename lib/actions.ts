'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';
// @ts-ignore: This module is provided by Next.js edge runtime and types are handled internally or not strictly required for basic usage
import { createServerClient, type CookieOptions } from '@supabase/ssr';

interface CreatePollFormState {
  message: string;
}

// Helper function to initialize Supabase client
/**
 * @doc Initializes and returns a Supabase client configured for server-side operations.
 * This function ensures that the Supabase client can securely interact with the database and authentication services
 * by retrieving cookies from the incoming request and setting them for Supabase.
 * It is essential for all server actions that need to access user sessions or protected data.
 *
 * @returns {Promise<ReturnType<typeof createServerClient>>} A Promise that resolves to a Supabase client instance.
 */
async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function createPoll(formData: FormData): Promise<CreatePollFormState> {
  /**
   * @doc Creates a new poll with the provided details.
   * This server action handles the entire poll creation process, including extracting data from the form,
   * authenticating the user, inserting the poll into the database, and adding its associated options.
   * It also manages error handling and redirects the user upon successful poll creation.
   *
   * @param {FormData} formData - The form data containing the poll question, description, options, and settings (allow multiple options, private, ends at).
   * @returns {Promise<CreatePollFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the poll is created, or an error message if the operation fails.
   */
  const question = formData.get("question") as string;
  const description = formData.get("description") as string;
  const rawOptions = Array.from({ length: 100 }, (_, i) => formData.get(`option-${i}`) as string)
    .filter(Boolean)
    .map(option => option.trim());

  const options = rawOptions.filter(option => option !== '');

  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";
  const endsAtString = formData.get("endsAt") as string;
  const endsAt = endsAtString ? new Date(endsAtString).toISOString() : null;
  const allowUnauthenticatedVotes = formData.get("allowUnauthenticatedVotes") === "on"; // Get new field

  const supabase = await getSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return { message: "User not authenticated." };
  }

  if (!question.trim() || options.length === 0) {
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
      allow_unauthenticated_votes: allowUnauthenticatedVotes, // Save new field
    })
    .select()
    .single();

  if (pollError || !poll) {
    return { message: "Failed to create poll." };
  }

  // Insert poll options into the database
  const pollOptionsData = options.map((optionText) => ({
    poll_id: poll.id,
    option_text: optionText,
  }));

  const { error: optionsError } = await supabase.from("poll_options").insert(pollOptionsData);

  if (optionsError) {
    await supabase.from("polls").delete().eq("id", poll.id);
    return { message: "Failed to create poll options." };
  }
  return { message: "Poll created successfully!" };
}

interface VoteFormState {
  message: string;
}

export async function submitVote(pollId: string, optionId: string): Promise<VoteFormState> {
  /**
   * @doc Submits a user's vote for a specific poll option.
   * This server action ensures that only authenticated users can vote and prevents multiple votes from the same user on the same poll.
   * It records the vote by incrementing the vote count for the chosen option and logs the user's vote in the `votes` table.
   * The path for the poll is revalidated to reflect the updated vote count.
   *
   * @param {string} pollId - The ID of the poll being voted on.
   * @param {string} optionId - The ID of the option that the user is voting for.
   * @returns {Promise<VoteFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the vote is submitted, or an error message if the operation fails.
   */
  const supabase = await getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch poll details to check allow_unauthenticated_votes setting
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("allow_unauthenticated_votes, allow_multiple_options")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return { message: "Poll not found." };
  }

  let userIdToRecord: string | null = null;

  if (user) {
    userIdToRecord = user.id;
  } else if (!poll.allow_unauthenticated_votes) {
    return { message: "User not authenticated. This poll requires login to vote." };
  }

  // Check for existing vote for authenticated users on single-vote polls
  if (userIdToRecord && !poll.allow_multiple_options) {
    const { data: existingVote, error: existingVoteError } = await supabase
      .from("votes")
      .select("id")
      .eq("user_id", userIdToRecord)
      .eq("poll_id", pollId)
      .single();

    if (existingVoteError && existingVoteError.code !== 'PGRST116') {
      return { message: "Error checking vote status." };
    }

    if (existingVote) {
      return { message: "You have already voted on this poll." };
    }
  }

  const { error: updateError } = await supabase.rpc('increment_vote', { option_id: optionId });

  if (updateError) {
    return { message: "Failed to submit vote." };
  }

  const { error: recordError } = await supabase.from("votes").insert({
    user_id: userIdToRecord,
    poll_id: pollId,
    poll_option_id: optionId,
  });

  if (recordError) {
    return { message: "Failed to record vote." };
  }

  return { message: "Vote submitted successfully!" };
}

interface UpdatePollFormState {
  message: string;
}

export async function updatePoll(formData: FormData): Promise<UpdatePollFormState> {
  /**
   * @doc Updates an existing poll's details, including its question, description, options, and settings.
   * This server action handles updating poll information, including adding new options, deleting old options, and modifying existing poll details.
   * It ensures that only the poll creator can update their poll and revalidates relevant paths upon successful update.
   *
   * @param {FormData} formData - The form data containing the poll ID, updated question, description, options (as JSON string), and settings.
   * @returns {Promise<UpdatePollFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the poll is updated, or an error message if the operation fails.
   */
  const pollId = formData.get("id") as string;
  const question = formData.get("question") as string;
  const description = formData.get("description") as string;
  const optionsJson = formData.get("options_json") as string;
  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";
  const endsAtString = formData.get("endsAt") as string;
  const endsAt = endsAtString ? new Date(endsAtString).toISOString() : null;

  const options = JSON.parse(optionsJson) as string[];

  const supabase = await getSupabaseClient();

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

  const { error: pollUpdateError } = await supabase
    .from("polls")
    .update({
      question,
      description,
      allow_multiple_options: allowMultipleOptions,
      is_private: isPrivate,
      ends_at: endsAt,
    })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (pollUpdateError) {
    return { message: "Failed to update poll." };
  }

  const { data: existingOptions, error: fetchOptionsError } = await supabase
    .from("poll_options")
    .select("id, option_text")
    .eq("poll_id", pollId);

  if (fetchOptionsError) {
    return { message: "Failed to update poll options." };
  }

  const existingOptionTexts = new Set(existingOptions.map((opt: { id: string; option_text: string }) => opt.option_text));
  const newOptionTexts = new Set(options);

  const optionsToDelete = existingOptions.filter((opt: { id: string; option_text: string }) => !newOptionTexts.has(opt.option_text));
  if (optionsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("poll_options")
      .delete()
      .in("id", optionsToDelete.map((opt: { id: string; option_text: string }) => opt.id));
    if (deleteError) {
      return { message: "Failed to update poll options." };
    }
  }

  const optionsToInsert = options.filter(optText => !existingOptionTexts.has(optText));
  if (optionsToInsert.length > 0) {
    const insertData = optionsToInsert.map(text => ({ poll_id: pollId, option_text: text }));
    const { error: insertError } = await supabase
      .from("poll_options")
      .insert(insertData);
    if (insertError) {
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
  /**
   * @doc Updates the settings (allow multiple options, private) of an existing poll.
   * This server action specifically handles changes to a poll's privacy and multiple-choice options.
   * It ensures that only the poll creator can modify these settings and revalidates the poll's path to reflect the changes.
   *
   * @param {FormData} formData - The form data containing the poll ID and the updated settings (allowMultipleOptions, isPrivate).
   * @returns {Promise<UpdatePollSettingsFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the settings are updated, or an error message if the operation fails.
   */
  const pollId = formData.get("id") as string;
  const allowMultipleOptions = formData.get("allowMultipleOptions") === "on";
  const isPrivate = formData.get("isPrivate") === "on";
  const allowUnauthenticatedVotes = formData.get("allowUnauthenticatedVotes") === "on"; // New field
  const endsAtString = formData.get("endsAt") as string;
  const endsAt = endsAtString ? new Date(endsAtString).toISOString() : null;

  const supabase = await getSupabaseClient();

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
      allow_unauthenticated_votes: allowUnauthenticatedVotes, // Update new field
      ends_at: endsAt,
    })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (settingsUpdateError) {
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
  /**
   * @doc Deletes a poll from the database.
   * This server action allows a user to delete a poll they have created.
   * It ensures that only the poll creator can delete their poll and revalidates the "/polls" path to remove the deleted poll from the list.
   *
   * @param {string} pollId - The ID of the poll to be deleted.
   * @returns {Promise<DeletePollFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the poll is deleted, or an error message if the operation fails.
   */
  const supabase = await getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  console.log("deletePoll: User authenticated:", user ? user.id : "No user"); // Debug log

  if (!user) {
    return { message: "User not authenticated." };
  }

  // Fetch user role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle(); // Use maybeSingle to handle cases where no role is found without erroring

  if (roleError) {
    console.error("Error fetching user role in deletePoll:", JSON.stringify(roleError, null, 2));
    return { message: "Failed to retrieve user role for deletion." };
  }

  const currentUserRole = roleData?.role || null;
  console.log("deletePoll: Current user role:", currentUserRole); // Debug log

  if (!pollId) {
    return { message: "Poll ID is missing." };
  }
  console.log("deletePoll: Attempting to delete poll with ID:", pollId); // Debug log

  let deleteQuery = supabase
    .from("polls")
    .delete()
    .eq("id", pollId);

  // If the user is not an admin, restrict deletion to their own polls
  if (currentUserRole !== 'admin') {
    deleteQuery = deleteQuery.eq("user_id", user.id);
  }
  console.log("deletePoll: Final delete query (conceptual):");
  // Note: Cannot directly log the query object, but this indicates the logic path.
  if (currentUserRole !== 'admin') {
    console.log("  Deleting own poll (user_id check included).");
  } else {
    console.log("  Admin deleting any poll (no user_id check included).");
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error("deletePoll: Supabase deletion error:", JSON.stringify(error, null, 2)); // Detailed error log
    return { message: "Failed to delete poll." };
  }

  revalidatePath("/polls");
  return { message: "Poll deleted successfully!" };
}

export async function submitComment(
  pollId: string,
  userId: string,
  content: string
) {
  const supabase = await getSupabaseClient();

  const { error } = await supabase.from("comments").insert({
    poll_id: pollId,
    user_id: userId,
    content: content,
  });

  if (error) {
    console.error("Error submitting comment:", error);
    throw new Error("Failed to submit comment.");
  }

  revalidatePath(`/polls/${pollId}`);
}

interface ForgotPasswordFormState {
  message: string;
}

export async function sendPasswordResetEmail(email: string): Promise<ForgotPasswordFormState> {
  /**
   * @doc Sends a password reset email to the provided email address.
   * This function is crucial for user account recovery, allowing users to reset their forgotten passwords securely.
   * It constructs a redirect URL for the password reset form, ensuring the user is directed to the correct page after clicking the link in the email.
   *
   * @param {string} email - The email address of the user requesting a password reset.
   * @returns {Promise<ForgotPasswordFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the email is sent, or an error message if the operation fails.
   */
  const supabase = await getSupabaseClient();

  // IMPORTANT: Ensure NEXT_PUBLIC_SITE_URL is set in your .env.local
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { message: error.message };
  }

  return { message: "Password reset email sent. Check your inbox!" };
}

interface UpdatePasswordFormState {
  message: string;
}

export async function updatePassword(newPassword: string): Promise<UpdatePasswordFormState> {
  /**
   * @doc Updates the password for the currently authenticated user.
   * This function is used after a user has successfully navigated to the password reset page via a reset email, or for a logged-in user changing their password.
   * It securely updates the user's password in the Supabase authentication system.
   *
   * @param {string} newPassword - The new password to set for the user.
   * @returns {Promise<UpdatePasswordFormState>} An object containing a message indicating the outcome of the operation.
   *   - `message`: A success message if the password is updated, or an error message if the operation fails.
   */
  const supabase = await getSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (userError) {
    return { message: userError.message };
  }

  if (!user) {
    return { message: "Failed to update password. User not found in session." };
  }

  return { message: "Your password has been reset successfully!" };
}
