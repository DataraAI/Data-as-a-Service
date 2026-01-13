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
      title: "Upload Video",
      description: "Upload a video file for processing and Azure upload",
      action: () => setIsUploadModalOpen(true),
      variant: "secondary", // Maps to Brand Green
    },
    {
      icon: Database,
      title: "Dataset Viewer",
      description: "Explore the dataset in our custom viewer",
      href: "/viewer",
      variant: "primary", // Maps to Brand Orange
    },
  ];

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4 text-foreground">
            Quick <span className="text-secondary">Actions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your video datasets and view processing results
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {actions.map((action, index) => (
            <Card
              key={index}
              className={`p-8 bg-card/50 border-border/30 hover-lift group animate-fade-up ${action.variant === 'secondary'
                  ? 'hover:border-secondary/50'
                  : 'hover:border-primary/50'
                }`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 ${action.variant === 'secondary'
                      ? 'bg-secondary/20 group-hover:bg-secondary/30'
                      : 'bg-primary/20 group-hover:bg-primary/30'
                    }`}
                >
                  <action.icon
                    className={`w-8 h-8 ${action.variant === 'secondary' ? 'text-secondary' : 'text-primary'
                      }`}
                  />
                </div>
                <h3 className="text-2xl font-bold font-display mb-2 text-foreground">
                  {action.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {action.description}
                </p>
              </div>

              {action.href ? (
                <Button
                  asChild
                  variant={action.variant === 'secondary' ? 'secondary' : 'default'}
                  className="w-full group/btn"
                  size="lg"
                >
                  <Link to={action.href}>
                    <span>Access Now</span>
                    <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={action.action}
                  variant={action.variant === 'secondary' ? 'secondary' : 'default'}
                  className="w-full group/btn"
                  size="lg"
                >
                  <span>Start Upload</span>
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
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold font-display mb-8 text-foreground">
            Explore More
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="ghost" className="group">
              API Documentation
              <ExternalLink className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform duration-300" />
            </Button>
            <Button variant="ghost" className="group">
              Research Papers
              <ExternalLink className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActionsSection;