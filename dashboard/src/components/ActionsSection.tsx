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
    <section className="py-20 relative bg-background border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-sans-tech mb-4 text-foreground uppercase tracking-tight">
            Quick <span className="text-primary">Actions</span>
          </h2>
          <div className="h-1 w-20 bg-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono-tech text-sm">
            Manage your datasets and view results
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {actions.map((action, index) => (
            <Card
              key={index}
              className="p-8 bg-card/10 backdrop-blur-sm border border-border group relative overflow-hidden transition-all hover:border-primary/50"
            >
              {/* Decorative corners */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 group-hover:border-primary transition-colors"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/30 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30 group-hover:border-primary transition-colors"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30 group-hover:border-primary transition-colors"></div>

              <div className="mb-6 relative z-10">
                <div
                  className="w-14 h-14 rounded-sm flex items-center justify-center mb-5 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all"
                >
                  <action.icon
                    className="w-7 h-7 text-primary"
                  />
                </div>
                <h3 className="text-2xl font-bold font-sans-tech mb-2 text-foreground">
                  {action.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-mono-tech text-sm">
                  {action.description}
                </p>
              </div>

              {action.href ? (
                <Button
                  asChild
                  variant="outline"
                  className="w-full group/btn border-primary/30 hover:bg-primary/10 hover:border-primary text-primary font-mono-tech"
                  size="lg"
                >
                  <Link to={action.href}>
                    <span>VIEW DATA</span>
                    <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={action.action}
                  className="w-full group/btn bg-primary hover:bg-primary/90 text-primary-foreground font-mono-tech"
                  size="lg"
                >
                  <span>IMPORT DATA</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Button>
              )}
            </Card>
          ))}
        </div>

        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />

        {/* Additional Links Section */}
        <div className="mt-20 text-center border-t border-border pt-10">
          <h3 className="text-xl font-bold font-sans-tech mb-8 text-foreground uppercase tracking-wider">
            SYSTEM RESOURCES
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="ghost" className="group font-mono-tech text-muted-foreground hover:text-primary">
              // API_DOCS
              <ExternalLink className="w-3 h-3 ml-2 group-hover:scale-110 transition-transform duration-300" />
            </Button>
            <Button variant="ghost" className="group font-mono-tech text-muted-foreground hover:text-primary">
              // RESEARCH_PAPERS
              <ExternalLink className="w-3 h-3 ml-2 group-hover:scale-110 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActionsSection;