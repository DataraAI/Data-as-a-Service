import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Cpu, Activity, Terminal } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen pt-20 flex flex-col justify-center overflow-hidden bg-background">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none"></div>

      {/* Corner Markers */}
      <div className="absolute top-24 left-6 w-4 h-4 border-t border-l border-primary/50"></div>
      <div className="absolute top-24 right-6 w-4 h-4 border-t border-r border-primary/50"></div>
      <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-primary/50"></div>
      <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-primary/50"></div>

      {/* Decorative coordinate text */}
      <div className="absolute top-28 left-8 font-mono-tech text-[10px] text-muted-foreground/40">
        System Operational // 34.0522 N, 118.2437 W
      </div>

      <div className="container mx-auto px-6 relative z-10 h-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center h-full">

          {/* Left Column: Content */}
          <div className="lg:col-span-7 flex flex-col gap-8">

            {/* Status Indicator */}
            <div className="inline-flex items-center gap-3 border border-border bg-card/50 backdrop-blur-sm px-3 py-1.5 w-fit">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </div>
              <span className="font-mono-tech text-xs text-success font-medium tracking-wider">System Status: Online</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-7xl font-sans-tech font-bold text-foreground leading-[1.1] tracking-tight">
              ADVANCED <br />
              ROBOTICS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-glow">DATASETS</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground font-sans-tech max-w-2xl leading-relaxed border-l-2 border-primary/50 pl-6">
              Accelerate your embodied AI development. High-fidelity, multi-modal sensor data for next-generation robotic perception and control.
            </p>

            {/* Stats Grid - Mini Bento */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
              <div className="border border-border p-4 bg-card/30 backdrop-blur-sm group hover:border-primary/50 transition-colors">
                <Database className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-bold font-sans-tech">10M+</div>
                <div className="text-xs text-muted-foreground font-mono-tech uppercase">Data Points</div>
              </div>
              <div className="border border-border p-4 bg-card/30 backdrop-blur-sm group hover:border-primary/50 transition-colors">
                <Activity className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-bold font-sans-tech">99.9%</div>
                <div className="text-xs text-muted-foreground font-mono-tech uppercase">Label Accuracy</div>
              </div>
              <div className="border border-border p-4 bg-card/30 backdrop-blur-sm group hover:border-primary/50 transition-colors">
                <Terminal className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-bold font-sans-tech">&lt;50ms</div>
                <div className="text-xs text-muted-foreground font-mono-tech uppercase">Latency</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans-tech font-bold rounded-md px-8 h-14 border border-primary-glow/50 shadow-glow">
                Connect Data Source <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="font-sans-tech font-medium rounded-md px-8 h-14 border-border hover:bg-muted/50 hover:text-foreground">
                Read Documentation
              </Button>
            </div>
          </div>

          {/* Right Column: Visualization / Blueprint */}
          <div className="lg:col-span-5 relative h-[500px] w-full hidden lg:block">
            {/* Tech Frame */}
            <div className="absolute inset-0 border border-border bg-card/10 backdrop-blur-[2px]">
              {/* Decorative brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>

              {/* Center Visualization Placeholder */}
              <div className="absolute inset-4 border border-dashed border-border/50 flex items-center justify-center bg-black/40">
                <div className="text-center">
                  <Cpu className="w-16 h-16 text-primary/50 mx-auto mb-4 animate-pulse" />
                  <span className="font-mono-tech text-sm text-primary/70 tracking-widest">Waiting for input stream...</span>
                </div>

                {/* Floating fake data points */}
                <div className="absolute top-10 right-10 font-mono-tech text-[10px] text-green-500/50">
                  x: 45.23<br />y: 12.01<br />z: 09.22
                </div>
                <div className="absolute bottom-20 left-10 font-mono-tech text-[10px] text-primary/50">
                  VEL: 1.2 m/s<br />ACC: 0.4 m/s²
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;