import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";
import { buildAuthPath } from "@/lib/authLinks";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Company", href: "/company" },
];

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isApproved, user, logout } = useAuth();

  const currentPath = `${location.pathname}${location.search}`;
  const loginHref = buildAuthPath("login", currentPath);
  const registerHref = buildAuthPath("register", currentPath);
  const canManageUsers =
    isAuthenticated && isApproved && (user?.role === "admin" || user?.role === "analyst");

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-primary/10 bg-[#050907]/95 text-foreground backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex h-[88px] items-center justify-between gap-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-primary text-[15px] font-black text-primary-foreground shadow-[0_10px_30px_rgba(29,233,182,0.18)]">
              D
            </div>
            <div className="min-w-0">
              <div className="truncate font-sans-tech text-lg font-extrabold tracking-[0.04em] text-primary">
                DataraAI
              </div>
              <div className="truncate text-[11px] font-medium text-muted-foreground">
                Data-as-a-Service
              </div>
            </div>
          </Link>

          <div className="hidden items-stretch lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`relative flex min-w-[148px] flex-col items-center justify-center border-x border-white/4 px-8 text-center transition-colors ${
                    isActive
                      ? "bg-primary/4 text-primary"
                      : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
                  }`}
                >
                  <span className="text-[15px] font-bold">{item.label}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-60">
                    {item.href === "/" ? "Overview" : "Team / Mission"}
                  </span>
                  <span
                    className={`absolute inset-x-[20%] bottom-0 h-0.5 rounded-t-full ${
                      isActive
                        ? "bg-primary shadow-[0_0_14px_rgba(29,233,182,0.7)]"
                        : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <>
                {canManageUsers && (
                  <Link
                    to="/admin/users"
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
                  >
                    User Access
                  </Link>
                )}
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {isApproved ? user?.role ?? "customer" : "pending"}
                  </div>
                  <div className="max-w-[220px] truncate text-sm text-foreground">
                    {user?.displayName ?? user?.email}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-10 rounded-full border border-white/12 px-5 text-sm font-semibold text-muted-foreground hover:border-primary/20 hover:bg-primary/6 hover:text-primary"
                  onClick={() => void logout()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to={loginHref}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
                >
                  Sign In
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(29,233,182,0.22)] transition-opacity hover:opacity-90"
                >
                  Get Access
                </Link>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl border border-white/8 bg-white/[0.03] text-muted-foreground hover:text-primary lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-white/6 pb-5 pt-4 lg:hidden">
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`block rounded-2xl border px-4 py-3 ${
                      isActive
                        ? "border-primary/20 bg-primary/8 text-primary"
                        : "border-white/8 bg-white/[0.03] text-muted-foreground"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-60">
                      {item.href === "/" ? "Overview" : "Team / Mission"}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 space-y-3 border-t border-white/6 pt-4">
              {isAuthenticated ? (
                <>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {isApproved ? user?.role ?? "customer" : "pending"}
                    </div>
                    <div className="mt-1 truncate text-sm text-foreground">
                      {user?.displayName ?? user?.email}
                    </div>
                  </div>

                  {canManageUsers && (
                    <Link
                      to="/admin/users"
                      className="block rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-muted-foreground"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      User Access
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-start rounded-2xl border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-muted-foreground hover:text-primary"
                    onClick={() => void logout()}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to={loginHref}
                    className="flex h-11 items-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-muted-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to={registerHref}
                    className="flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Access
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
