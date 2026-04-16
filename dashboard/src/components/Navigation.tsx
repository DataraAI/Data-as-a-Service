import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const roboDataHubItems = [
  { label: "RoboDataHub Home", href: "/viewer" },
  { label: "Car Automation", href: "/viewer/carAutomation" },
  { label: "Serverrack", href: "/viewer/serverrack" },
  { label: "Dexterity", href: "/viewer/dexterity" },
  { label: "Warehouse", href: "/viewer/warehouse" },
];

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Explore Datasets", href: "/explore" },
];

const secondaryNavItems = [
  { label: "RoboEyeView", href: "/roboeyeview" },
  { label: "Platform", href: "/platform" },
  { label: "Documentation", href: "/docs" },
];

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRoboDataHubOpen, setIsRoboDataHubOpen] = useState(false);
  const [isMobileRoboDataHubOpen, setIsMobileRoboDataHubOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsRoboDataHubOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoboDataHubOpen((open) => !open)}
                className="flex items-center gap-2 font-mono-tech text-sm uppercase tracking-wide text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                RoboDataHub
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isRoboDataHubOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isRoboDataHubOpen && (
                <div className="absolute left-0 top-full mt-3 min-w-[240px] overflow-hidden rounded-sm border border-border bg-background/95 shadow-2xl shadow-black/30 backdrop-blur-md">
                  {roboDataHubItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block border-b border-border px-4 py-3 font-sans-tech text-sm text-foreground transition-colors last:border-b-0 hover:bg-primary/10 hover:text-primary"
                      onClick={() => setIsRoboDataHubOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

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
            onClick={() => setIsMenuOpen(!isMenuOpen)}
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

              <div className="overflow-hidden rounded-sm border border-border">
                <button
                  type="button"
                  onClick={() => setIsMobileRoboDataHubOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-3 py-3 text-left font-mono-tech text-sm uppercase text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  RoboDataHub
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isMobileRoboDataHubOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isMobileRoboDataHubOpen && (
                  <div className="border-t border-border bg-card/20">
                    {roboDataHubItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="block border-b border-border px-3 py-3 font-sans-tech text-sm text-foreground transition-colors last:border-b-0 hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                          setIsMobileRoboDataHubOpen(false);
                          setIsMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

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
