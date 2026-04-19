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
    <section className="relative border-t border-border/50 bg-background py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-sans-tech text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            // PLATFORM_METRICS
          </h2>
          <div className="flex gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary/50" />
            <div className="h-2 w-2 rounded-full bg-primary/20" />
            <div className="h-2 w-2 rounded-full bg-primary/20" />
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="group border border-border bg-card/20 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 sm:p-6"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono-tech text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="font-sans-tech text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
              <p className="mt-2 border-t border-border pt-2 font-mono-tech text-sm text-muted-foreground/80">
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
