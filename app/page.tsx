"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "../lib/supabaseClient"; // Corrected import path
import { useEffect, useState } from "react";

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Removed: const supabase = createClient(); // `supabase` is already the client instance

  useEffect(() => {
    setIsClient(true);
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-200 text-gray-800 p-4 sm:p-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-indigo-700 mb-4 animate-fade-in-down">
          Welcome to Polly
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 max-w-2xl mx-auto animate-fade-in-up">
          Create engaging polls, share them with unique links and QR codes,
          and gather opinions effortlessly.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 max-w-5xl w-full">
        <FeatureCard
          icon="📊"
          title="Create Custom Polls"
          description="Design polls with multiple options, descriptions, and privacy settings."
        />
        <FeatureCard
          icon="🔗"
          title="Share Instantly"
          description="Generate unique links and QR codes for effortless sharing on any platform."
        />
        <FeatureCard
          icon="🗳️"
          title="Collect Votes"
          description="Allow anyone to vote, track results in real-time, and get insights."
        />
      </section>

      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up-delay">
        {!isAuthenticated && (
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-8 py-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
            <Link href="/auth">
              Login / Sign Up
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="bg-white hover:bg-gray-100 text-indigo-600 border-indigo-600 text-lg px-8 py-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
          <Link href="/polls">
            View Public Polls
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-indigo-600 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Add some basic animations using Tailwind CSS utility classes
// You might need to extend your tailwind.config.js for custom animation keyframes if not already defined
/*
@layer components {
  .animate-fade-in-down {
    animation: fade-in-down 1s ease-out;
  }
  .animate-fade-in-up {
    animation: fade-in-up 1s ease-out;
  }
  .animate-fade-in-up-delay {
    animation: fade-in-up 1s ease-out 0.5s forwards;
    opacity: 0;
  }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
*/
