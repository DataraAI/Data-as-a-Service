import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const roboDataHubItems = [
  { label: "RoboDataHub Home", href: "/viewer" },
  { label: "Car Automation", href: "/viewer/carAutomation" },
  { label: "Humanoid", href: "/viewer/humanoid" },
  { label: "Serverrack", href: "/viewer/serverrack" },
  { label: "Warehouse", href: "/viewer/warehouse" },
  { label: "Search all data", href: "/viewer/searchAll" },
];

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Explore Datasets", href: "/explore" },
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-mono-tech font-bold text-sm">D</span>
            </div>
            <span className="text-xl font-bold font-sans-tech tracking-tight text-foreground">
              DATARA<span className="text-primary">.AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm tracking-wide uppercase"
            >
              Home
            </Link>

            <Link
              to="/explore"
              className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm tracking-wide uppercase"
            >
              Explore Datasets
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoboDataHubOpen((open) => !open)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm tracking-wide uppercase"
              >
                RoboDataHub
                <ChevronDown className={`w-4 h-4 transition-transform ${isRoboDataHubOpen ? "rotate-180" : ""}`} />
              </button>

              {isRoboDataHubOpen && (
                <div className="absolute top-full left-0 mt-3 min-w-[240px] border border-border bg-background/95 backdrop-blur-md shadow-2xl shadow-black/30 rounded-sm overflow-hidden">
                  {roboDataHubItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-4 py-3 text-sm font-sans-tech text-foreground hover:bg-primary/10 hover:text-primary transition-colors border-b border-border last:border-b-0"
                      onClick={() => setIsRoboDataHubOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {primaryNavItems.slice(2).map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm tracking-wide uppercase"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="font-mono-tech text-sm hover:text-primary transition-colors">Sign In</Button>
            <Button variant="default" className="font-mono-tech text-sm rounded-sm bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow border border-primary/20">Get Started</Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4 bg-background">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm uppercase py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>

              <Link
                to="/explore"
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm uppercase py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Explore Datasets
              </Link>

              <div className="border border-border rounded-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileRoboDataHubOpen((open) => !open)}
                  className="w-full flex items-center justify-between px-3 py-3 text-left text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm uppercase"
                >
                  RoboDataHub
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMobileRoboDataHubOpen ? "rotate-180" : ""}`} />
                </button>
                {isMobileRoboDataHubOpen && (
                  <div className="border-t border-border bg-card/20">
                    {roboDataHubItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="block px-3 py-3 text-sm font-sans-tech text-foreground hover:bg-primary/10 hover:text-primary transition-colors border-b border-border last:border-b-0"
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

              {primaryNavItems.slice(2).map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors duration-200 font-mono-tech text-sm uppercase py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="ghost" className="font-mono-tech w-full justify-start">Sign In</Button>
                <Button variant="default" className="font-mono-tech w-full justify-start rounded-sm">Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
