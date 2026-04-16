import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import automotiveImage from "@/assets/product/automotive.png";
import datacenterImage from "@/assets/product/datacenter.png";
import manipulationImage from "@/assets/product/manipulation.png";
import warehouseImage from "@/assets/product/warehouse.png";
import {
  Boxes,
  Database,
  Eye,
  Hand,
  Layers3,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

type GalleryItem = {
  image: string;
  alt: string;
  label: string;
};

type HighlightItem = {
  title: string;
  description: string;
};

type ProductSection = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  summary: string;
  icon: LucideIcon;
  highlights: HighlightItem[];
  gallery: GalleryItem[];
};

const productGallery = {
  automotive: {
    image: automotiveImage,
    alt: "Automotive production line dataset",
    label: "Automotive",
  },
  datacenter: {
    image: datacenterImage,
    alt: "Data center rack and cable handling dataset",
    label: "Data Center",
  },
  manipulation: {
    image: manipulationImage,
    alt: "Hand motion and dexterous manipulation dataset",
    label: "Manipulation",
  },
  warehouse: {
    image: warehouseImage,
    alt: "Warehouse logistics dataset",
    label: "Warehouse",
  },
} satisfies Record<string, GalleryItem>;

const heroHighlights = [
  {
    label: "Real-world first",
    description: "Training signals built from production environments instead of synthetic-only shortcuts.",
  },
  {
    label: "Deployment aligned",
    description: "Organized around the workflows that matter in warehouses, factories, and data centers.",
  },
  {
    label: "Integrated stack",
    description: "Data, view transformation, dexterous motion, and task structure connected in one product story.",
  },
];

const productSections: ProductSection[] = [
  {
    id: "robodatahub",
    step: "1",
    title: "RoboDataHub",
    subtitle: "Large-scale industrial datasets for Physical AI.",
    summary: "A structured data foundation spanning automotive, warehouse, server-rack, and dexterous manipulation workflows.",
    icon: Database,
    highlights: [
      {
        title: "Real environments",
        description: "Capture production-floor conditions, edge cases, and operational variance without rebuilding collection from scratch.",
      },
      {
        title: "Faster readiness",
        description: "Shorten the path from raw footage to training-ready assets for perception and control teams.",
      },
      {
        title: "Cross-industry coverage",
        description: "Unify high-value scenarios across logistics, data infrastructure, factory tasks, and fine manipulation.",
      },
    ],
    gallery: [
      productGallery.datacenter,
      productGallery.warehouse,
      productGallery.automotive,
      productGallery.manipulation,
    ],
  },
  {
    id: "roboeyeview",
    step: "2",
    title: "RoboEyeView",
    subtitle: "Transforms standard video into robot-eye-view training data.",
    summary: "Turn external viewpoints into action-relevant ego perspectives without changing the surrounding industrial workflow.",
    icon: Eye,
    highlights: [
      {
        title: "Robot-centric view",
        description: "Translate existing camera feeds into the viewpoints models need for planning and low-level action understanding.",
      },
      {
        title: "Physics-aware context",
        description: "Preserve occlusion, geometry, contact, and motion cues that are easy to lose in generic video pipelines.",
      },
      {
        title: "Deployment fit",
        description: "Improve perception quality for real industrial tasks without rebuilding the entire sensing stack.",
      },
    ],
    gallery: [
      productGallery.automotive,
      productGallery.datacenter,
      productGallery.warehouse,
      productGallery.manipulation,
    ],
  },
  {
    id: "robohandmotion",
    step: "3",
    title: "RoboHandMotion",
    subtitle: "Fine-grained interaction data for hands, tools, and objects.",
    summary: "Detailed dexterity signals built for manipulation-heavy tasks where precision matters more than generic movement labels.",
    icon: Hand,
    highlights: [
      {
        title: "Dexterity signals",
        description: "Track subtle grasp changes, finger intent, and object interaction details that are often missing from broad datasets.",
      },
      {
        title: "Interaction quality",
        description: "Retain the temporal detail needed for reliable hand-tool-object coordination in practical workflows.",
      },
      {
        title: "Task precision",
        description: "Support manipulation learning for operations that demand steadiness, control, and consistent repeatability.",
      },
    ],
    gallery: [
      productGallery.manipulation,
      productGallery.automotive,
      productGallery.datacenter,
      productGallery.warehouse,
    ],
  },
  {
    id: "robotaskmanipulator",
    step: "4",
    title: "RoboTaskManipulator",
    subtitle: "Task-level intelligence for structured, multi-step execution.",
    summary: "Move from isolated clips to workflow-aware task representations that mirror how real operations are carried out.",
    icon: Workflow,
    highlights: [
      {
        title: "Workflow structure",
        description: "Break observed operations into explicit stages so execution models can understand sequence and dependencies.",
      },
      {
        title: "Execution readiness",
        description: "Create task representations that are closer to how production automation must behave on the floor.",
      },
      {
        title: "Operational consistency",
        description: "Improve repeatability for multi-step routines that combine perception, manipulation, and environment state.",
      },
    ],
    gallery: [
      productGallery.warehouse,
      productGallery.automotive,
      productGallery.datacenter,
      productGallery.manipulation,
    ],
  },
];

const platformSignals = ["Manufacturing", "Warehousing", "Data Centers", "Dexterity"];

export default function Product() {
  const [activeSection, setActiveSection] = useState(productSections[0].id);

  useEffect(() => {
    const sections = productSections
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-35% 0px -45% 0px",
        threshold: 0.01,
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSection(sectionId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.08]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,rgba(248,112,7,0.22),transparent_30%),radial-gradient(circle_at_10%_25%,rgba(16,158,59,0.18),transparent_24%)]" />

        <main className="container relative z-10 mx-auto px-6 pb-16 pt-24">
          <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="xl:sticky xl:top-24 xl:self-start">
              <div className="overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <div className="border-b border-border px-6 py-6">
                  <div className="font-mono-tech text-[11px] uppercase tracking-[0.24em] text-primary">
                    Datara.AI
                  </div>
                  <h1 className="mt-3 font-sans-tech text-3xl font-bold tracking-tight text-foreground">
                    Product
                  </h1>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                    The DaaS product stack presented in the same structured layout as your reference page, but styled for the existing DataraAI site.
                  </p>
                </div>

                <div className="px-6 pb-6 pt-5">
                  <div className="px-2 pb-3 font-mono-tech text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Solutions
                  </div>
                  <div className="relative flex flex-col gap-3 pl-2">
                    <div className="pointer-events-none absolute bottom-3 left-5 top-3 w-px bg-gradient-to-b from-primary/15 via-primary/40 to-success/20" />

                    {productSections.map((section) => {
                      const isActive = activeSection === section.id;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className={`group relative rounded-2xl border px-4 py-4 pl-14 text-left transition-all duration-200 ${
                            isActive
                              ? "border-primary/35 bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(248,112,7,0.08)]"
                              : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/20 hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`absolute left-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border font-mono-tech text-xs font-bold ${
                              isActive
                                ? "border-primary/50 bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground"
                            }`}
                          >
                            {section.step}
                          </span>

                          <span className="block font-sans-tech text-[15px] font-semibold">
                            {section.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {section.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <section className="relative overflow-hidden rounded-[32px] border border-border bg-card/70 px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:px-10 md:py-12">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(248,112,7,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,158,59,0.12),transparent_28%)]" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-mono-tech text-[11px] uppercase tracking-[0.22em] text-primary">
                    <Layers3 className="h-3.5 w-3.5" />
                    Physical AI Product Platform
                  </div>

                  <h2 className="mt-6 max-w-4xl font-sans-tech text-4xl font-bold tracking-tight text-foreground md:text-6xl md:leading-[1.02]">
                    Robot-ready data and execution intelligence for real industrial deployment.
                  </h2>

                  <p className="mt-5 max-w-3xl border-l-2 border-primary/40 pl-5 text-base leading-8 text-muted-foreground md:text-lg">
                    DataraAI turns raw operational footage into structured training signals for perception, dexterity, task execution, and robot-eye-view learning, all within a layout that mirrors your uploaded reference page.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {platformSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {heroHighlights.map((item, index) => (
                      <div
                        key={item.label}
                        className="rounded-[22px] border border-border bg-background/55 p-5 backdrop-blur-sm"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="font-mono-tech text-[11px] uppercase tracking-[0.2em] text-primary">
                            {item.label}
                          </div>
                          <Boxes
                            className={`h-4 w-4 ${
                              index === 2 ? "text-success" : "text-primary"
                            }`}
                          />
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="mt-6 space-y-6">
                {productSections.map((section) => {
                  const SectionIcon = section.icon;

                  return (
                    <section
                      key={section.id}
                      id={section.id}
                      className="scroll-mt-24"
                    >
                      <div
                        data-product-section
                        className="relative overflow-hidden rounded-[28px] border border-border bg-card/75 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-8"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(248,112,7,0.06),transparent_35%,rgba(16,158,59,0.05))]" />

                        <div className="relative">
                          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div className="max-w-3xl">
                              <div className="font-mono-tech text-[11px] uppercase tracking-[0.22em] text-primary">
                                Solution {section.step}
                              </div>
                              <div className="mt-4 flex items-center gap-4">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                  <SectionIcon className="h-5 w-5" />
                                </div>
                                <h3 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground md:text-[2rem]">
                                  {section.title}
                                </h3>
                              </div>
                              <p className="mt-4 text-lg leading-8 text-foreground/90">
                                {section.subtitle}
                              </p>
                              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                                {section.summary}
                              </p>
                            </div>

                            <div className="w-full max-w-xs rounded-2xl border border-success/20 bg-success/10 px-4 py-3 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-success">
                              Structured for real deployment workflows
                            </div>
                          </div>

                          <div className="mt-8 grid gap-4 lg:grid-cols-3">
                            {section.highlights.map((highlight) => (
                              <div
                                key={highlight.title}
                                className="rounded-[22px] border border-border bg-background/55 p-5 backdrop-blur-sm"
                              >
                                <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-success" />
                                <div className="mt-4 font-sans-tech text-base font-semibold text-foreground">
                                  {highlight.title}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  {highlight.description}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {section.gallery.map((item) => (
                              <div
                                key={`${section.id}-${item.label}`}
                                className="group relative overflow-hidden rounded-[22px] border border-border bg-background"
                              >
                                <div className="aspect-[5/4] overflow-hidden">
                                  <img
                                    src={item.image}
                                    alt={item.alt}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/78 to-transparent px-4 pb-4 pt-12">
                                  <span className="inline-flex rounded-full border border-border bg-background/80 px-3 py-1 font-mono-tech text-[11px] uppercase tracking-[0.16em] text-foreground">
                                    {item.label}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      <FooterSection />
    </div>
  );
}
