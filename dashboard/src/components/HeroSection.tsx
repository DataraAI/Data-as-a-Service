import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Cpu, Activity, Terminal } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background pt-20">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.15]" />

      <div className="absolute left-6 top-24 h-4 w-4 border-l border-t border-primary/50" />
      <div className="absolute right-6 top-24 h-4 w-4 border-r border-t border-primary/50" />
      <div className="absolute bottom-6 left-6 h-4 w-4 border-b border-l border-primary/50" />
      <div className="absolute bottom-6 right-6 h-4 w-4 border-b border-r border-primary/50" />

      <div className="absolute left-8 top-28 font-mono-tech text-[10px] text-muted-foreground/40">
        System Operational // 34.0522 N, 118.2437 W
      </div>

      <div className="container relative z-10 mx-auto h-full px-6">
        <div className="grid h-full grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="inline-flex w-fit items-center gap-3 border border-border bg-card/50 px-3 py-1.5 backdrop-blur-sm">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-glow" />
              </div>
              <span className="font-mono-tech text-xs font-medium tracking-wider text-primary-glow">
                System Status: Online
              </span>
            </div>

            <h1 className="font-sans-tech text-5xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-7xl">
              ADVANCED <br />
              ROBOTICS{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                DATASETS
              </span>
            </h1>

            <p className="max-w-2xl border-l-2 border-primary/50 pl-6 font-sans-tech text-lg leading-relaxed text-muted-foreground">
              Accelerate your embodied AI development. High-fidelity, multi-modal sensor data
              for next-generation robotic perception and control.
            </p>

            <div className="my-4 grid grid-cols-2 gap-4 md:grid-cols-3">
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

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 rounded-md border border-primary-glow/40 bg-primary px-8 font-sans-tech font-bold text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                Connect Data Source <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-md border-border px-8 font-sans-tech font-medium hover:bg-muted/50 hover:text-foreground"
              >
                Read Documentation
              </Button>
            </div>
          </div>

          <div className="relative hidden h-[500px] w-full lg:col-span-5 lg:block">
            <div className="absolute inset-0 border border-border bg-card/10 backdrop-blur-[2px]">
              <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary" />
              <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-primary" />
              <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary" />

              <div className="absolute inset-4 flex items-center justify-center border border-dashed border-border/50 bg-background/65">
                <div className="text-center">
                  <Cpu className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary/55" />
                  <span className="font-mono-tech text-sm tracking-widest text-primary-glow/85">
                    Waiting for input stream...
                  </span>
                </div>

                <div className="absolute right-10 top-10 font-mono-tech text-[10px] text-primary-glow/55">
                  x: 45.23
                  <br />
                  y: 12.01
                  <br />
                  z: 09.22
                </div>
                <div className="absolute bottom-20 left-10 font-mono-tech text-[10px] text-primary/55">
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
