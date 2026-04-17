import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "RoboDataHub", href: "/viewer" },
  { label: "Explore Datasets", href: "/explore" },
];

const secondaryNavItems = [
  { label: "RoboEyeView", href: "/roboeyeview" },
  { label: "Platform", href: "/platform" },
  { label: "Documentation", href: "/docs" },
];

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
              <span className="font-mono-tech text-sm font-bold text-primary-foreground">D</span>
            </div>
            <span className="font-sans-tech text-xl font-bold tracking-tight text-foreground">
              DATARA<span className="text-primary">.AI</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {primaryNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="font-mono-tech text-sm uppercase tracking-wide text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}

            {secondaryNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="font-mono-tech text-sm uppercase tracking-wide text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
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
            className="md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border bg-background py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="py-2 font-mono-tech text-sm uppercase text-muted-foreground transition-colors duration-200 hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {secondaryNavItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="py-2 font-mono-tech text-sm uppercase text-muted-foreground transition-colors duration-200 hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className="flex flex-col gap-2 border-t border-border pt-4">
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
