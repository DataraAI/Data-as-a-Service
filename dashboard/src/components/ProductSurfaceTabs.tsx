import { Link } from "react-router-dom";

type ProductSurfaceKey =
  | "solutions"
  | "robodatahub"
  | "roboeyeview"
  | "robohandmotion"
  | "robotaskmanipulator";

type ProductSurfaceTabsProps = {
  active: ProductSurfaceKey;
  className?: string;
};

const ITEMS: Array<{
  key: ProductSurfaceKey;
  label: string;
  subtitle: string;
  to: string;
}> = [
  {
    key: "solutions",
    label: "Solutions",
    subtitle: "Full stack overview",
    to: "/product",
  },
  {
    key: "robodatahub",
    label: "RoboDataHub",
    subtitle: "Dataset catalog",
    to: "/viewer",
  },
  {
    key: "roboeyeview",
    label: "RoboEyeView",
    subtitle: "Visual intelligence",
    to: "/roboeyeview",
  },
  {
    key: "robohandmotion",
    label: "RoboHandMotion",
    subtitle: "Humanoid data",
    to: "/product#robohandmotion",
  },
  {
    key: "robotaskmanipulator",
    label: "RoboTaskManipulator",
    subtitle: "Task execution",
    to: "/product#robotaskmanipulator",
  },
];

export default function ProductSurfaceTabs({
  active,
  className = "",
}: ProductSurfaceTabsProps) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/6 bg-[#040608]/92 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-col gap-5 px-4 py-4 md:px-5 md:py-5">
        <div className="px-2">
          <div className="font-mono-tech text-[11px] uppercase tracking-[0.24em] text-primary">
            Product Surfaces
          </div>
          <h2 className="mt-3 font-sans-tech text-2xl font-bold tracking-tight text-foreground">
            Navigate the DataraAI stack
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Move between the broader solutions overview and the live product surfaces without
            losing the shared visual system.
          </p>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {ITEMS.map((item) => {
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`group w-[220px] rounded-[24px] border p-5 transition-all duration-200 ${
                    isActive
                      ? "border-primary/35 bg-primary/10 shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
                      : "border-white/6 bg-[#0b0f13]/85 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-[#0d1116]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 font-mono-tech text-[10px] uppercase tracking-[0.16em] ${
                        isActive
                          ? "border-primary-glow/25 bg-primary-glow/10 text-primary-glow"
                          : "border-white/10 bg-black/20 text-muted-foreground"
                      }`}
                    >
                      {isActive ? "Open" : "Browse"}
                    </span>
                  </div>
                  <div className="mt-5 font-sans-tech text-base font-semibold text-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.subtitle}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
