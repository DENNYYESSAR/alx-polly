"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react"; // Import icons

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Login successful!");
      router.push("/polls"); // Redirect to polls page on successful login
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"} // Conditionally set type
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />} 
        </Button>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </Button>
      {message && <p className="text-center text-red-500">{message}</p>}
      <div className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}



