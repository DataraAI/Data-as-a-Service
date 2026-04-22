import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Cpu, Activity, Terminal } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-background pt-20">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.12]" />

      <div className="absolute left-4 top-24 hidden h-4 w-4 border-l border-t border-primary/50 sm:block" />
      <div className="absolute right-4 top-24 hidden h-4 w-4 border-r border-t border-primary/50 sm:block" />
      <div className="absolute bottom-6 left-4 hidden h-4 w-4 border-b border-l border-primary/50 sm:block" />
      <div className="absolute bottom-6 right-4 hidden h-4 w-4 border-b border-r border-primary/50 sm:block" />

      <div className="absolute left-8 top-28 hidden font-mono-tech text-[10px] text-muted-foreground/40 xl:block">
        System Operational // 34.0522 N, 118.2437 W
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 sm:pb-20 lg:pb-24">
        <div className="grid items-center gap-10 xl:min-h-[calc(100svh-9rem)] xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.78fr)] xl:gap-12">
          <div className="max-w-3xl">
            <div className="inline-flex w-fit items-center gap-3 border border-border bg-card/50 px-3 py-1.5 backdrop-blur-sm">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </div>
              <span className="font-mono-tech text-[11px] font-medium tracking-[0.22em] text-success">
                System Status: Online
              </span>
            </div>

            <h1 className="mt-6 font-sans-tech text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
              ADVANCED <br />
              ROBOTICS{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                DATASETS
              </span>
            </h1>

            <p className="mt-6 max-w-2xl border-l-2 border-primary/50 pl-4 font-sans-tech text-base leading-relaxed text-muted-foreground sm:pl-6 sm:text-lg">
              Accelerate your embodied AI development. High-fidelity, multi-modal sensor data
              for next-generation robotic perception and control.
            </p>

            <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="group border border-border bg-card/30 p-4 backdrop-blur-sm transition-colors hover:border-primary/50">
                <Database className="mb-2 h-5 w-5 text-primary" />
                <div className="font-sans-tech text-2xl font-bold">10M+</div>
                <div className="font-mono-tech text-xs uppercase text-muted-foreground">
                  Data Points
                </div>
              </div>
              <div className="group border border-border bg-card/30 p-4 backdrop-blur-sm transition-colors hover:border-primary/50">
                <Activity className="mb-2 h-5 w-5 text-primary" />
                <div className="font-sans-tech text-2xl font-bold">99.9%</div>
                <div className="font-mono-tech text-xs uppercase text-muted-foreground">
                  Label Accuracy
                </div>
              </div>
              <div className="group border border-border bg-card/30 p-4 backdrop-blur-sm transition-colors hover:border-primary/50">
                <Terminal className="mb-2 h-5 w-5 text-primary" />
                <div className="font-sans-tech text-2xl font-bold">&lt;50ms</div>
                <div className="font-mono-tech text-xs uppercase text-muted-foreground">
                  Latency
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-14 w-full rounded-md border border-primary-glow/40 bg-primary px-6 font-sans-tech font-bold text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto sm:px-8"
              >
                Connect Data Source <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-md border-border px-6 font-sans-tech font-medium hover:bg-muted/50 hover:text-foreground sm:w-auto sm:px-8"
              >
                Read Documentation
              </Button>
            </div>
          </div>

          <div className="relative h-[280px] w-full sm:h-[360px] lg:h-[460px] xl:h-[520px]">
            <div className="absolute inset-0 border border-border bg-card/10 backdrop-blur-[2px]">
              <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary" />
              <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-primary" />
              <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary" />

              <div className="absolute inset-3 flex items-center justify-center border border-dashed border-border/50 bg-background/65 sm:inset-4">
                <div className="text-center">
                  <Cpu className="mx-auto mb-4 h-12 w-12 animate-pulse text-primary/55 sm:h-16 sm:w-16" />
                  <span className="font-mono-tech text-xs tracking-[0.2em] text-primary-glow/85 sm:text-sm">
                    Waiting for input stream...
                  </span>
                </div>

                <div className="absolute right-4 top-4 hidden font-mono-tech text-[10px] text-primary-glow/55 sm:block">
                  x: 45.23
                  <br />
                  y: 12.01
                  <br />
                  z: 09.22
                </div>
                <div className="absolute bottom-4 left-4 hidden font-mono-tech text-[10px] text-primary/55 sm:block">
                  VEL: 1.2 m/s
                  <br />
                  ACC: 0.4 m/s²
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
