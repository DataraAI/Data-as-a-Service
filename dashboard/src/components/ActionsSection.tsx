import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Upload, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { UploadModal } from "@/components/UploadModal";

const ActionsSection = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const actions = [
    {
      icon: Upload,
      title: "Import Dataset",
      description: "Upload a dataset for processing",
      action: () => setIsUploadModalOpen(true),
      variant: "default",
    },
    {
      icon: Database,
      title: "Dataset Viewer",
      description: "Explore the dataset in our custom viewer",
      href: "/viewer",
      variant: "secondary",
    },
  ];

  return (
    <section className="relative border-t border-border/50 bg-background py-20">
      <div className="container mx-auto px-6">
        <div className="mb-14 text-center">
          <h2 className="mb-4 font-sans-tech text-3xl font-bold uppercase tracking-tight text-foreground md:text-4xl">
            Quick <span className="text-primary">Actions</span>
          </h2>
          <div className="mx-auto mb-4 h-1 w-20 bg-primary" />
          <p className="mx-auto max-w-2xl font-mono-tech text-sm text-muted-foreground">
            Manage your datasets and view results
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {actions.map((action, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border border-border bg-card/10 p-8 backdrop-blur-sm transition-all hover:border-primary/50"
            >
              <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-primary/30 transition-colors group-hover:border-primary" />
              <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-primary/30 transition-colors group-hover:border-primary" />
              <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-primary/30 transition-colors group-hover:border-primary" />
              <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary/30 transition-colors group-hover:border-primary" />

              <div className="relative z-10 mb-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 transition-all group-hover:bg-primary/20">
                  <action.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 font-sans-tech text-2xl font-bold text-foreground">
                  {action.title}
                </h3>
                <p className="font-mono-tech text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </p>
              </div>

              {action.href ? (
                <Button
                  asChild
                  variant="outline"
                  className="group/btn w-full border-primary/30 font-mono-tech text-primary hover:border-primary hover:bg-primary/10"
                  size="lg"
                >
                  <Link to={action.href}>
                    <span>VIEW DATA</span>
                    <ExternalLink className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={action.action}
                  className="group/btn w-full bg-primary font-mono-tech text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  <span>IMPORT DATA</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Button>
              )}
            </Card>
          ))}
        </div>

        <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />

        <div className="mt-20 border-t border-border pt-10 text-center">
          <h3 className="mb-8 font-sans-tech text-xl font-bold uppercase tracking-wider text-foreground">
            SYSTEM RESOURCES
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="ghost" className="group font-mono-tech text-muted-foreground hover:text-primary">
              // API_DOCS
              <ExternalLink className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:scale-110" />
            </Button>
            <Button variant="ghost" className="group font-mono-tech text-muted-foreground hover:text-primary">
              // RESEARCH_PAPERS
              <ExternalLink className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:scale-110" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActionsSection;
