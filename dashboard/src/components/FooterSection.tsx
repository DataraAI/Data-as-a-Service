import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Twitter, Linkedin, Mail, ArrowUp } from "lucide-react";

const FooterSection = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-border/50 bg-card">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <span className="text-sm font-bold text-primary-foreground">D</span>
              </div>
              <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-xl font-bold text-transparent">
                Datara.AI
              </span>
            </div>
            <p className="mb-6 max-w-md leading-relaxed text-muted-foreground">
              Empowering the future of robotics with high-quality training data. Building the
              foundation for efficient, accurate AI models that will power tomorrow&apos;s
              physical robots.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="transition-colors duration-300 hover:text-primary">
                <Github className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="transition-colors duration-300 hover:text-primary">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="transition-colors duration-300 hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="transition-colors duration-300 hover:text-primary">
                <Mail className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">Platform</h4>
            <div className="space-y-3">
              <a href="/datasets" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Datasets
              </a>
              <a href="/api" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                API Access
              </a>
              <a href="/tools" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                AI Tools
              </a>
              <a href="/integrations" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Integrations
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-foreground">Resources</h4>
            <div className="space-y-3">
              <a href="/docs" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Documentation
              </a>
              <a href="/research" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Research
              </a>
              <a href="/blog" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Blog
              </a>
              <a href="/support" className="block text-muted-foreground transition-colors duration-300 hover:text-primary">
                Support
              </a>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <span>&copy; 2024 Datara.AI. All rights reserved.</span>
            <a href="/privacy" className="transition-colors duration-300 hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors duration-300 hover:text-primary">
              Terms of Service
            </a>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="group transition-colors duration-300 hover:text-primary"
          >
            Back to top
            <ArrowUp className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1" />
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
