import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LockKeyhole, ShieldAlert, UserPlus } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/useAuth";

type AuthMode = "login" | "register";

function sanitizeNext(nextValue: string | null) {
  if (!nextValue) return "/viewer";
  if (nextValue.startsWith("/")) return nextValue;
  return "/viewer";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = (searchParams.get("mode") === "register" ? "register" : "login") as AuthMode;
  const nextPath = useMemo(() => sanitizeNext(searchParams.get("next")), [searchParams]);
  const { isLoading, isAuthenticated, isApproved, submitLogin, submitRegister, logout } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isApproved) {
      navigate(nextPath, { replace: true });
    }
  }, [isApproved, isAuthenticated, isLoading, navigate, nextPath]);

  const swapMode = (nextMode: AuthMode) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", nextMode);
    params.set("next", nextPath);
    setSearchParams(params, { replace: true });
    setErrorMessage(null);
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const state = await submitLogin(email.trim(), password);
      if (state.isApproved) {
        navigate(nextPath, { replace: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (!displayName.trim()) {
        throw new Error("Display name is required");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const state = await submitRegister({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      if (state.isApproved) {
        navigate(nextPath, { replace: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApproval = !isLoading && isAuthenticated && !isApproved;

  return (
    <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
      <Navigation />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-10 pt-24 sm:px-6">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-sm border border-border bg-card/30 p-8 shadow-2xl shadow-black/10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-mono-tech text-xs uppercase tracking-[0.24em] text-primary">
              Datara Access
            </div>
            <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Datara-managed accounts for private robotics data
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Accounts are created directly with Datara, reviewed by an admin, and then used to
              control access to public datasets, private uploads, and derived outputs.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <div className="mb-2 font-mono-tech text-[11px] uppercase tracking-wide text-primary">
                  Shared catalog
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Approved accounts can browse the shared public dataset library without exposing it
                  anonymously on the internet.
                </p>
              </div>
              <div className="rounded-sm border border-border bg-background/60 p-4">
                <div className="mb-2 font-mono-tech text-[11px] uppercase tracking-wide text-primary">
                  Private workspaces
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Each account keeps private datasets and derived outputs inside its own container
                  namespace and route scope.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-card/50 p-8 shadow-2xl shadow-black/10">
            {isLoading ? (
              <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking account state...
              </div>
            ) : pendingApproval ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <ShieldAlert className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-sans-tech text-2xl font-bold text-foreground">
                  Account pending approval
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Your Datara account exists and can sign in, but dataset access stays locked until
                  an admin approves it.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={() => void logout()} variant="outline" className="font-sans-tech">
                    Sign out
                  </Button>
                  <Button onClick={() => navigate("/")} className="font-sans-tech">
                    Back to home
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 flex rounded-sm border border-border bg-background/60 p-1">
                  <button
                    type="button"
                    onClick={() => swapMode("login")}
                    className={`flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                      mode === "login"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => swapMode("register")}
                    className={`flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                      mode === "register"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Register
                  </button>
                </div>

                {mode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="mb-2 flex items-center gap-2">
                      <LockKeyhole className="h-5 w-5 text-primary" />
                      <h2 className="font-sans-tech text-2xl font-bold text-foreground">Sign in</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Use your Datara account details to continue to the platform.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="auth-email" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auth-password" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="auth-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    {errorMessage && (
                      <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errorMessage}
                      </div>
                    )}

                    <Button type="submit" className="w-full font-sans-tech" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Need an account?{" "}
                      <button
                        type="button"
                        onClick={() => swapMode("register")}
                        className="font-medium text-primary hover:underline"
                      >
                        Register here
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="mb-2 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <h2 className="font-sans-tech text-2xl font-bold text-foreground">Create account</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      New accounts are created in a pending state and unlock after Datara approval.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="auth-display-name" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Display name
                      </Label>
                      <Input
                        id="auth-display-name"
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Password
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password" className="font-mono-tech text-[11px] uppercase tracking-wide text-muted-foreground">
                        Confirm password
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-11 rounded-sm border-border bg-background/80"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    {errorMessage && (
                      <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errorMessage}
                      </div>
                    )}

                    <Button type="submit" className="w-full font-sans-tech" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => swapMode("login")}
                        className="font-medium text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}

                <div className="mt-6 border-t border-border pt-5 text-center text-xs text-muted-foreground">
                  <span>Next destination: </span>
                  <span className="font-mono-tech text-foreground">{nextPath}</span>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
