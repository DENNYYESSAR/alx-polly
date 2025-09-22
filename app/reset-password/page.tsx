import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-12">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-md bg-card text-card-foreground">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your new password below.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}






