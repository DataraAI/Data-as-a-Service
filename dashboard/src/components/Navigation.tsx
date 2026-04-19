import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/product" },
  { label: "RoboDataHub", href: "/viewer" },
  { label: "Explore Datasets", href: "/explore" },
];

const secondaryNavItems = [
  { label: "RoboEyeView", href: "/roboeyeview" },
  { label: "Platform", href: "/platform" },
  { label: "Documentation", href: "/docs" },
];

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <Button
              variant="ghost"
              className="font-mono-tech text-sm transition-colors hover:text-primary"
            >
              Sign In
            </Button>
            <Button
              variant="default"
              className="rounded-sm border border-primary/20 bg-primary font-mono-tech text-sm text-primary-foreground shadow-glow hover:bg-primary-glow"
            >
              Get Started
            </Button>
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

              <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                <Button variant="ghost" className="w-full justify-start font-mono-tech">
                  Sign In
                </Button>
                <Button variant="default" className="w-full justify-start rounded-sm font-mono-tech">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
