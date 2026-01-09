import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Twitter, Linkedin, Mail, ArrowUp } from "lucide-react";

const FooterSection = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border/50">
      <div className="container mx-auto px-6 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Company info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Datara.AI
              </span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
              Empowering the future of robotics with high-quality training data. 
              Building the foundation for efficient, accurate AI models that will power tomorrow's physical robots.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="hover:text-primary transition-colors duration-300">
                <Github className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary transition-colors duration-300">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary transition-colors duration-300">
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary transition-colors duration-300">
                <Mail className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Platform</h4>
            <div className="space-y-3">
              <a href="/datasets" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Datasets
              </a>
              <a href="/api" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                API Access
              </a>
              <a href="/tools" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                AI Tools
              </a>
              <a href="/integrations" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Integrations
              </a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
            <div className="space-y-3">
              <a href="/docs" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Documentation
              </a>
              <a href="/research" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Research
              </a>
              <a href="/blog" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Blog
              </a>
              <a href="/support" className="block text-muted-foreground hover:text-primary transition-colors duration-300">
                Support
              </a>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>© 2024 Datara.AI. All rights reserved.</span>
            <a href="/privacy" className="hover:text-primary transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors duration-300">
              Terms of Service
            </a>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={scrollToTop}
            className="group hover:text-primary transition-colors duration-300"
          >
            Back to top
            <ArrowUp className="w-4 h-4 ml-2 group-hover:-translate-y-1 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;