import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-12">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-md bg-card text-card-foreground">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Forgot your password?
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email to receive a password reset link.
        </p>
        <ForgotPasswordForm />
        <div className="text-center text-sm mt-4">
          <Link href="/auth" className="font-medium text-primary hover:underline flex items-center justify-center">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

