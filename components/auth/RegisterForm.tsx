"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react"; // Import icons

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState(""); // New state for first name
  const [lastName, setLastName] = useState(""); // New state for last name
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    // First, try to sign in the user. If successful, they are already registered.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError) {
      // If signInWithPassword is successful, the user is already registered and logged in.
      setMessage("You are already registered and logged in!");
      router.push("/polls");
      setFirstName(""); // Clear first name
      setLastName(""); // Clear last name
      setEmail(""); // Clear email
      setPassword(""); // Clear password
      setConfirmPassword(""); // Clear confirm password
      setLoading(false);
      return;
    }

    // If signInWithPassword failed, check if it's because the user wasn't found
    // If the error is not 'Invalid login credentials' (or similar for user not found), then it's a different error.
    if (signInError && !signInError.message.includes("Invalid login credentials") && !signInError.message.includes("Email not confirmed")) {
      setMessage(signInError.message);
      setLoading(false);
      return;
    }

    // If signInWithPassword failed because user not found, proceed with signUp
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setMessage("This email is already registered. Please log in.");
      } else {
        setMessage(signUpError.message);
      }
    } else if (data.user) {
      // If signup is successful, insert profile data
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email, // Assuming email should also be in profiles table
        });

      if (profileInsertError) {
        console.error("Error inserting profile data:", profileInsertError);
        setMessage("Registration successful, but failed to save profile data.");
      } else {
        setMessage("Registration successful! Please check your email for a confirmation link. You may now log in.");
      }
      router.push("/auth"); // Redirect to login page
      setFirstName(""); // Clear first name
      setLastName(""); // Clear last name
      setEmail(""); // Clear email
      setPassword(""); // Clear password
      setConfirmPassword(""); // Clear confirm password
    } else {
      setMessage("Registration successful! Please check your email for a confirmation link.");
      router.push("/auth"); // Redirect to login page
      setFirstName(""); // Clear first name
      setLastName(""); // Clear last name
      setEmail(""); // Clear email
      setPassword(""); // Clear password
      setConfirmPassword(""); // Clear confirm password
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Input
        type="text"
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
      />
      <Input
        type="text"
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
      {message && <p>{message}</p>}
    </form>
  );
}
