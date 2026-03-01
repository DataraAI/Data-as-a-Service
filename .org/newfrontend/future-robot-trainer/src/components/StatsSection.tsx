import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Database, Activity } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      icon: Database,
      title: "Total Datasets",
      value: "10",
      subtitle: "High-quality robotics datasets",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Activity,
      title: "Storage Used",
      value: "337.76 MB",
      subtitle: "Efficiently compressed data",
      gradient: "from-red-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      title: "API Calls Today",
      value: "120",
      subtitle: "Real-time data access",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: Users,
      title: "Active Users",
      value: "1",
      subtitle: "Growing research community",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <section className="py-16 bg-gradient-hero">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Platform Overview
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time insights into your robotics training data pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-gradient-card border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;