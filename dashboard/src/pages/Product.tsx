import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Database,
  Eye,
  Hand,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

type GalleryItem = {
  imagePath: string;
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
  cta: string;
  ctaHref: string;
  icon: LucideIcon;
  badge: string;
  highlights: HighlightItem[];
  gallery: GalleryItem[];
};

const PRODUCT_GALLERY = {
  automotive: {
    imagePath: "carAutomation/automotive.png",
    alt: "Automotive production line dataset",
    label: "Automotive",
  },
  datacenter: {
    imagePath: "serverrack/datacenter.png",
    alt: "Data center rack and cable handling dataset",
    label: "Data Center",
  },
  manipulation: {
    imagePath: "humanoid/manipulation.png",
    alt: "Hand motion and dexterous manipulation dataset",
    label: "Humanoid",
  },
  warehouse: {
    imagePath: "warehouse/warehouseproduct.png",
    alt: "Warehouse logistics dataset",
    label: "Warehouse",
  },
} satisfies Record<string, GalleryItem>;

const ROBO_EYE_GALLERY = {
  automotivePrimary: {
    imagePath: "carAutomation/ego_carautomation.png",
    alt: "Automotive robot-eye-view example from RoboEyeView",
    label: "Automotive A",
  },
  automotiveSecondary: {
    imagePath: "carAutomation/2ego_carautomation.png",
    alt: "Automotive alternate robot-eye-view example from RoboEyeView",
    label: "Automotive B",
  },
  datacenterPrimary: {
    imagePath: "serverrack/ego_serverrack.png",
    alt: "Data-center robot-eye-view example from RoboEyeView",
    label: "Data Center A",
  },
  datacenterSecondary: {
    imagePath: "serverrack/2ego_serverrack1.png",
    alt: "Data-center alternate robot-eye-view example from RoboEyeView",
    label: "Data Center B",
  },
} satisfies Record<string, GalleryItem>;

const PRODUCT_SECTIONS: ProductSection[] = [
  {
    id: "robodatahub",
    step: "01",
    title: "RoboDataHub",
    subtitle: "EGO + EXO datasets across physical AI domains.",
    summary:
      "A production-ready dataset library for physical AI teams working across automotive, warehouse, data-center, and humanoid workflows.",
    cta: "Open RoboDataHub",
    ctaHref: "/viewer",
    icon: Database,
    badge: "Core Platform",
    highlights: [
      {
        title: "Real environments",
        description:
          "Start from real operating environments instead of trying to recreate production complexity from scratch.",
      },
      {
        title: "Structured access",
        description:
          "Move cleanly from category to endpoint folder to orig, EGO, mask, and corner-case assets.",
      },
      {
        title: "Cross-industry coverage",
        description:
          "Cover high-value robot tasks across logistics, data infrastructure, factory workflows, and dexterous manipulation.",
      },
    ],
    gallery: [
      PRODUCT_GALLERY.datacenter,
      PRODUCT_GALLERY.warehouse,
      PRODUCT_GALLERY.automotive,
      PRODUCT_GALLERY.manipulation,
    ],
  },
  {
    id: "roboeyeview",
    step: "02",
    title: "RoboEyeView",
    subtitle: "Patented EXO to EGO synthesis for robot training data.",
    summary:
      "Convert existing EXO footage into robot-eye training data without rebuilding your capture stack around every robot form factor.",
    cta: "See RoboEyeView",
    ctaHref: "/roboeyeview",
    icon: Eye,
    badge: "Patented IP",
    highlights: [
      {
        title: "Robot-centric view",
        description:
          "Turn external footage into the viewpoints robot models actually need for action-level learning.",
      },
      {
        title: "Physics-aware context",
        description:
          "Preserve occlusion, contact, geometry, and motion cues that generic media pipelines often miss.",
      },
      {
        title: "Deployment fit",
        description:
          "Support real industrial deployment without forcing new sensing hardware into every workflow.",
      },
    ],
    gallery: [
      ROBO_EYE_GALLERY.automotivePrimary,
      ROBO_EYE_GALLERY.automotiveSecondary,
      ROBO_EYE_GALLERY.datacenterPrimary,
      ROBO_EYE_GALLERY.datacenterSecondary,
    ],
  },
  {
    id: "robohandmotion",
    step: "03",
    title: "RoboHandMotion",
    subtitle: "Fine-grained interaction data for hands, tools, and objects.",
    summary:
      "High-detail interaction data for manipulation-heavy workflows where grasp quality and hand-object coordination matter.",
    cta: "Request access",
    ctaHref: buildAuthPath("register", "/product#robohandmotion"),
    icon: Hand,
    badge: "Patented IP",
    highlights: [
      {
        title: "Dexterity signals",
        description:
          "Capture subtle grasp changes, contact points, and object interaction details that broad datasets usually miss.",
      },
      {
        title: "Interaction quality",
        description:
          "Retain the temporal detail needed for reliable hand-tool-object coordination in practical workflows.",
      },
      {
        title: "Task precision",
        description:
          "Support manipulation learning for operations that demand steadiness, control, and repeatability.",
      },
    ],
    gallery: [],
  },
  {
    id: "robotaskmanipulator",
    step: "04",
    title: "RoboTaskManipulator",
    subtitle: "Task-level intelligence for structured, multi-step execution.",
    summary:
      "Move from isolated scenes to workflow-aware task structure that mirrors how real operations are executed on the floor.",
    cta: "Request access",
    ctaHref: buildAuthPath("register", "/product#robotaskmanipulator"),
    icon: Workflow,
    badge: "Task Intelligence",
    highlights: [
      {
        title: "Workflow structure",
        description:
          "Break observed operations into explicit stages so execution models can understand sequence and dependencies.",
      },
      {
        title: "Execution readiness",
        description:
          "Create task representations that are closer to how production automation actually needs to behave.",
      },
      {
        title: "Operational consistency",
        description:
          "Improve repeatability for multi-step routines that combine perception, manipulation, and environment state.",
      },
    ],
    gallery: [],
  },
];

function ProductImageCard({ item }: { item: GalleryItem }) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(item.imagePath);

  if (!src || failed) {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-white/6 bg-[#0b0f13]">
        <div className="flex aspect-[5/4] items-center justify-center bg-black/30">
          <Database className="h-9 w-9 text-primary/60" />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-12">
          <span className="inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground">
            {item.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/6 bg-[#0b0f13]">
      <div className="aspect-[5/4] overflow-hidden">
        <img
          src={src}
          alt={item.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-4 pt-12">
        <span className="inline-flex rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground">
          {item.label}
        </span>
      </div>
    </div>
  );
}

export default function Product() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.replace("#", ""));
    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="relative overflow-hidden pt-[88px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.06]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,rgba(29,233,182,0.18),transparent_28%),radial-gradient(circle_at_10%_25%,rgba(30,136,229,0.12),transparent_24%)]" />

        <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
          <div className="grid gap-4 xl:grid-cols-4">
            {PRODUCT_SECTIONS.map((section) => (
              <Link
                key={section.id}
                to={`/product#${section.id}`}
                className="rounded-[24px] border border-white/6 bg-[#0d1014]/85 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-1 hover:border-primary/20"
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {section.badge}
                </div>
                <div className="mt-4 text-lg font-extrabold text-white">{section.title}</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.subtitle}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 space-y-6">
            {PRODUCT_SECTIONS.map((section) => {
              const SectionIcon = section.icon;

              return (
                <section key={section.id} id={section.id} className="scroll-mt-[120px]">
                  <div className="overflow-hidden rounded-[28px] border border-white/6 bg-[#0d1014]/88 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] md:p-8">
                    <div className="max-w-3xl">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-primary">
                        Solution {section.step}
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <SectionIcon className="h-5 w-5" />
                        </div>
                        <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-[2rem]">
                          {section.title}
                        </h2>
                      </div>
                      <p className="mt-4 text-lg leading-8 text-white/90">{section.subtitle}</p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
                        {section.summary}
                      </p>
                      <div className="mt-6">
                        <Link
                          to={section.ctaHref}
                          className="inline-flex items-center gap-2 text-sm font-bold text-primary"
                        >
                          {section.cta}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {section.highlights.map((highlight) => (
                        <div
                          key={highlight.title}
                          className="rounded-[22px] border border-white/6 bg-black/20 p-5"
                        >
                          <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-primary-glow" />
                          <div className="mt-4 text-base font-semibold text-white">
                            {highlight.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {highlight.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    {section.gallery.length > 0 && (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {section.gallery.map((item) => (
                          <ProductImageCard
                            key={`${section.id}-${item.label}-${item.imagePath}`}
                            item={item}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-8 overflow-hidden rounded-[28px] border border-white/6 bg-[linear-gradient(135deg,#050e0a_0%,#060c14_50%,#04080f_100%)] p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
            <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-extrabold tracking-tight text-white">
              Ready to build with DataraAI?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Start with live datasets and EXO-to-EGO generation today, then expand into the next
              product layers as your physical AI pipeline matures.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/viewer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
              >
                Browse RoboDataHub
              </Link>
              <Link
                to="/roboeyeview"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 px-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                View RoboEyeView
              </Link>
            </div>
          </section>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
