import { LockKeyhole, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";

interface AuthRequiredStateProps {
  title?: string;
  description?: string;
}

export default function AuthRequiredState({
  title = "Sign in required",
  description = "You need an approved account before this part of the data platform becomes available.",
}: AuthRequiredStateProps) {
  const { isAuthenticated, isApproved, login, register, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-sm border border-border bg-card/20 p-8 text-muted-foreground">
        Checking account access...
      </div>
    );
  }

  const pendingApproval = isAuthenticated && !isApproved;

  return (
    <div className="flex min-h-[360px] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-sm border border-border bg-card/40 p-8 text-center shadow-2xl shadow-black/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          {pendingApproval ? (
            <ShieldAlert className="h-8 w-8 text-primary" />
          ) : (
            <LockKeyhole className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="font-sans-tech text-2xl font-bold text-foreground">
          {pendingApproval ? "Account pending approval" : title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-sans-tech text-sm leading-relaxed text-muted-foreground">
          {pendingApproval
            ? "Your Datara account was created successfully, but data access still needs to be approved by an admin. Once approved, this page will unlock automatically the next time you refresh."
            : description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {!pendingApproval ? (
            <>
              <Button onClick={() => login()} className="font-sans-tech">
                Sign in
              </Button>
              <Button onClick={() => register()} variant="outline" className="font-sans-tech">
                Register
              </Button>
            </>
          ) : (
            <Button onClick={() => void logout()} variant="outline" className="font-sans-tech">
              Sign out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
