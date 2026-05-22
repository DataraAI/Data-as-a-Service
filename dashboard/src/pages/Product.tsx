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
  tone: string;
  iconTone: string;
  highlights: HighlightItem[];
  gallery: GalleryItem[];
};

function getSectionHref(sectionId: string) {
  switch (sectionId) {
    case "robodatahub":
      return "/robodatahub";
    case "roboeyeview":
      return "/roboeyeview";
    case "robohandmotion":
      return "/robohandmotion";
    case "robotaskmanipulator":
      return "/robotaskmanipulator";
    default:
      return "/product";
  }
}

const PRODUCT_SECTIONS: ProductSection[] = [
  {
    id: "robodatahub",
    step: "01",
    title: "RoboDataHub",
    subtitle: "EGO + EXO datasets across physical AI domains.",
    summary:
      "A production-ready dataset library for physical AI teams working across automotive, warehouse, data-center, and humanoid workflows.",
    cta: "Open RoboDataHub",
    ctaHref: "/robodatahub",
    icon: Database,
    badge: "Core Platform",
    tone: "border-teal-200 bg-teal-50/65",
    iconTone: "border-teal-200 bg-white text-primary",
    highlights: [
      {
        title: "Real environments",
        description:
          "Start from operating environments instead of trying to recreate production complexity from scratch.",
      },
      {
        title: "Structured access",
        description:
          "Move cleanly from category to endpoint folder to ORIG, EGO, mask, and corner-case assets.",
      },
      {
        title: "Cross-industry coverage",
        description:
          "Cover high-value robot tasks across logistics, data infrastructure, factory workflows, and dexterous manipulation.",
      },
    ],
    gallery: [
      {
        imagePath: "serverrack/datacenter.png",
        alt: "Data center rack and cable handling dataset",
        label: "Data Center",
      },
      {
        imagePath: "warehouse/warehouseproduct.png",
        alt: "Warehouse logistics dataset",
        label: "Warehouse",
      },
      {
        imagePath: "carAutomation/automotive.png",
        alt: "Automotive production line dataset",
        label: "Automotive",
      },
      {
        imagePath: "humanoid/manipulation.png",
        alt: "Hand motion and dexterous manipulation dataset",
        label: "Humanoid",
      },
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
    tone: "border-blue-200 bg-blue-50/65",
    iconTone: "border-blue-200 bg-white text-sky-700",
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
          "Support industrial deployment without forcing new sensing hardware into every workflow.",
      },
    ],
    gallery: [
      {
        imagePath: "carAutomation/ego_carautomation.png",
        alt: "Automotive robot-eye-view example from RoboEyeView",
        label: "Automotive A",
      },
      {
        imagePath: "carAutomation/2ego_carautomation.png",
        alt: "Automotive alternate robot-eye-view example from RoboEyeView",
        label: "Automotive B",
      },
      {
        imagePath: "serverrack/ego_serverrack.png",
        alt: "Data-center robot-eye-view example from RoboEyeView",
        label: "Data Center A",
      },
      {
        imagePath: "serverrack/2ego_serverrack1.png",
        alt: "Data-center alternate robot-eye-view example from RoboEyeView",
        label: "Data Center B",
      },
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
    ctaHref: buildAuthPath("register", "/robohandmotion"),
    icon: Hand,
    badge: "Patented IP",
    tone: "border-violet-200 bg-violet-50/65",
    iconTone: "border-violet-200 bg-white text-violet-700",
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
    gallery: [
      {
        imagePath: "humanoid/humanoid1.png",
        alt: "Humanoid cleaning interaction",
        label: "Surface Cleaning",
      },
      {
        imagePath: "humanoid/humanoid2.png",
        alt: "Humanoid dishwasher interaction",
        label: "Dishwasher",
      },
      {
        imagePath: "humanoid/humanoid3.png",
        alt: "Humanoid dishwashing interaction",
        label: "Dish Washing",
      },
      {
        imagePath: "humanoid/humanoid5.png",
        alt: "Humanoid laundry interaction",
        label: "Laundry",
      },
    ],
  },
  {
    id: "robotaskmanipulator",
    step: "04",
    title: "RoboTaskManipulator",
    subtitle: "Task-level intelligence for structured, multi-step execution.",
    summary:
      "Move from isolated scenes to workflow-aware task structure that mirrors how real operations are executed on the floor.",
    cta: "Request access",
    ctaHref: buildAuthPath("register", "/robotaskmanipulator"),
    icon: Workflow,
    badge: "Task Intelligence",
    tone: "border-orange-200 bg-orange-50/65",
    iconTone: "border-orange-200 bg-white text-orange-700",
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
    gallery: [
      {
        imagePath: "warehouse/warehouse4.png",
        alt: "Warehouse loading workflow",
        label: "Warehouse",
      },
      {
        imagePath: "carAutomation/carAutomation2.png",
        alt: "Assembly line workflow",
        label: "Assembly",
      },
      {
        imagePath: "serverrack/serverrack1.png",
        alt: "Data center workflow",
        label: "Data Center",
      },
      {
        imagePath: "warehouse/warehouse1.png",
        alt: "Pallet workflow",
        label: "Pallet Build",
      },
    ],
  },
];

function ProductImageCard({ item }: { item: GalleryItem }) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(item.imagePath);

  if (!src || failed) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
        <div className="flex aspect-[5/4] items-center justify-center bg-slate-50">
          <Database className="h-9 w-9 text-primary/60" />
        </div>
        <div className="border-t border-slate-200 px-4 py-4">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600">
            {item.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-1">
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
      <div className="border-t border-slate-200 px-4 py-4">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600">
          {item.label}
        </span>
      </div>
    </div>
  );
}

export default function Product() {
  const location = useLocation();
  const routeFocusedSectionId =
    location.pathname === "/robohandmotion"
      ? "robohandmotion"
      : location.pathname === "/robotaskmanipulator"
        ? "robotaskmanipulator"
        : null;
  const focusedSection =
    PRODUCT_SECTIONS.find((section) => section.id === routeFocusedSectionId) ?? null;
  const visibleSections = focusedSection ? [focusedSection] : PRODUCT_SECTIONS;

  useEffect(() => {
    if (routeFocusedSectionId) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (!location.hash) return;
    const target = document.getElementById(location.hash.replace("#", ""));
    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [location.hash, routeFocusedSectionId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.08),transparent_24%),radial-gradient(circle_at_82%_8%,rgba(29,78,216,0.08),transparent_18%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-14 sm:px-6 md:py-18">
          <div className="mx-auto max-w-[1440px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              {focusedSection ? focusedSection.badge : "DataraAI Product Suite"}
            </div>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,5.5vw,4.6rem)] font-black leading-[0.98] tracking-[-0.06em] text-slate-950">
              {focusedSection ? (
                focusedSection.title
              ) : (
                <>
                  Four coordinated surfaces for
                  <br />
                  real-world robotics data.
                </>
              )}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              {focusedSection
                ? `${focusedSection.subtitle} ${focusedSection.summary}`
                : "DataraAI's product family works as one connected system across dataset infrastructure, EXO-to-EGO transformation, dexterous motion understanding, and task-level execution intelligence."}
            </p>

            {focusedSection ? (
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to={focusedSection.ctaHref}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
                >
                  {focusedSection.cta}
                </Link>
                <Link
                  to="/#products"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  View Product Suite
                </Link>
              </div>
            ) : (
              <div className="mt-10 grid gap-4 xl:grid-cols-4">
                {PRODUCT_SECTIONS.map((section) => (
                  <Link
                    key={section.id}
                    to={getSectionHref(section.id)}
                    className={`rounded-[24px] border p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_34px_rgba(15,23,42,0.06)] ${section.tone}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {section.badge}
                    </div>
                    <div className="mt-4 text-lg font-extrabold text-slate-950">{section.title}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{section.subtitle}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
          <div className="space-y-6">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon;

              return (
                <section key={section.id} id={section.id} className="scroll-mt-[120px]">
                  <div className="marketing-surface rounded-[28px] p-6 md:p-8">
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-primary">
                          Solution {section.step}
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                          <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${section.iconTone}`}>
                            <SectionIcon className="h-5 w-5" />
                          </div>
                          <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-[2rem]">
                            {section.title}
                          </h2>
                        </div>
                        <p className="mt-4 text-lg leading-8 text-slate-800">{section.subtitle}</p>
                        <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
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

                        <div className="mt-8 grid gap-4">
                          {section.highlights.map((highlight) => (
                            <div
                              key={highlight.title}
                              className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5"
                            >
                              <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-primary to-primary-glow" />
                              <div className="mt-4 text-base font-semibold text-slate-950">
                                {highlight.title}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {highlight.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Representative previews
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {section.badge}
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {section.gallery.map((item) => (
                            <ProductImageCard
                              key={`${section.id}-${item.label}-${item.imagePath}`}
                              item={item}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef6f5_100%)] p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-[clamp(1.8rem,2.5vw,2.3rem)] font-extrabold tracking-tight text-slate-950">
              Ready to build with DataraAI?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Start with live datasets and EXO-to-EGO generation, then expand into dexterity and
              task-level intelligence as your physical AI stack matures.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/robodatahub"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Browse RoboDataHub
              </Link>
              <Link
                to="/roboeyeview"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
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
