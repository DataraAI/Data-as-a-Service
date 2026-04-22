import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/product" },
  { label: "RoboDataHub", href: "/viewer" },
  { label: "Explore Datasets", href: "/explore" },
];

const secondaryNavItems = [{ label: "RoboEyeView", href: "/roboeyeview" }];
const allNavItems = [...primaryNavItems, ...secondaryNavItems];

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, isApproved, user, login, register, logout } = useAuth();
  const location = useLocation();

  const loginTarget = `${location.pathname}${location.search}`;

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary">
              <span className="font-mono-tech text-sm font-bold text-primary-foreground">D</span>
            </div>
            <span className="truncate font-sans-tech text-lg font-bold tracking-tight text-foreground sm:text-xl">
              DATARA<span className="text-primary">.AI</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 xl:flex">
            {allNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="font-mono-tech text-sm uppercase tracking-wide text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            {isAuthenticated ? (
              <>
                <div className="rounded-sm border border-border bg-card/40 px-3 py-2 text-right">
                  <div className="font-mono-tech text-[10px] uppercase tracking-wide text-muted-foreground">
                    {isApproved ? user?.role ?? "user" : "pending"}
                  </div>
                  <div className="max-w-[220px] truncate font-sans-tech text-sm text-foreground">
                    {user?.displayName ?? user?.email}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="font-mono-tech text-sm transition-colors hover:text-primary"
                  onClick={() => void logout()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="font-mono-tech text-sm transition-colors hover:text-primary"
                  onClick={() => login(loginTarget)}
                >
                  Sign In
                </Button>
                <Button
                  variant="ghost"
                  className="font-mono-tech text-sm transition-colors hover:text-primary"
                  onClick={() => register(loginTarget)}
                >
                  Register
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 xl:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border bg-background/98 xl:hidden">
            <div className="custom-scrollbar max-h-[calc(100svh-4rem)] overflow-y-auto py-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {allNavItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="rounded-sm border border-border bg-card/30 px-4 py-3 font-mono-tech text-sm uppercase tracking-wide text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {isAuthenticated && (
                  <div className="rounded-sm border border-border bg-card/30 px-4 py-3">
                    <div className="font-mono-tech text-[10px] uppercase tracking-wide text-muted-foreground">
                      {isApproved ? user?.role ?? "user" : "pending approval"}
                    </div>
                    <div className="mt-1 truncate font-sans-tech text-sm text-foreground">
                      {user?.displayName ?? user?.email}
                    </div>
                  </div>
                )}

                {!isAuthenticated ? (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-mono-tech"
                      onClick={() => login(loginTarget)}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-mono-tech"
                      onClick={() => register(loginTarget)}
                    >
                      Register
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-mono-tech"
                    onClick={() => void logout()}
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
