import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Database, Activity } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      icon: Database,
      title: "Total Datasets",
      value: "10",
      subtitle: "High-quality robotics datasets",
    },
    {
      icon: Activity,
      title: "Storage Used",
      value: "337.76 MB",
      subtitle: "Efficiently compressed data",
    },
    {
      icon: TrendingUp,
      title: "API Calls Today",
      value: "120",
      subtitle: "Real-time data access",
    },
    {
      icon: Users,
      title: "Active Users",
      value: "1",
      subtitle: "Growing research community",
    },
  ];

  return (
    <section className="py-16 bg-background relative border-t border-border/50">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none"></div>
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between mb-12 border-b border-border pb-4">
          <h2 className="text-3xl font-sans-tech font-bold text-foreground tracking-tight">
            // PLATFORM_METRICS
          </h2>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-primary/20"></div>
            <div className="w-2 h-2 rounded-full bg-primary/20"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-card/20 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-mono-tech text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold font-sans-tech text-foreground">{stat.value}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground/80 font-mono-tech border-t border-border pt-2 mt-2">
                {stat.subtitle}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;