import { Hand, Sparkles, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

type ProcessStep = {
  step: string;
  title: string;
  description: string;
  accentClassName: string;
};

type GalleryCard = {
  title: string;
  description: string;
  imagePath: string;
  labels: string[];
};

type ShowcaseSection = {
  eyebrow: string;
  title: string;
  description: string;
  cards: GalleryCard[];
};

const STATS = [
  { value: "Patented", label: "Hand-motion pipeline" },
  { value: "Pose", label: "Hands, tools, objects" },
  { value: "Dexterous", label: "Task fidelity" },
  { value: "Multi-scene", label: "Home + commercial" },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    step: "Step 01",
    title: "Capture hand-task footage",
    description:
      "Record third-person footage of kitchen, cleaning, or household manipulation workflows without rebuilding the environment around the robot.",
    accentClassName: "border-blue-200 bg-blue-50 text-sky-700",
  },
  {
    step: "Step 02",
    title: "Run the RoboHandMotion engine",
    description:
      "Generate hand pose, tool contact, and object-state signals that are structured for dexterous policy training instead of generic visual review.",
    accentClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    step: "Step 03",
    title: "Train with manipulation-ready outputs",
    description:
      "Deliver sequences that retain grasp quality, contact detail, and temporal structure for the tasks where precision actually matters.",
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
];

const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    eyebrow: "Kitchen Tasks",
    title: "High-fidelity dexterous datasets for kitchen and appliance workflows.",
    description:
      "Focus on the practical hand-task scenarios that are hardest to capture with broad, generic datasets and matter most for dexterous training.",
    cards: [
      {
        title: "Dishwasher unloading",
        description: "Plate, utensil, and rack interaction with dense contact changes across the sequence.",
        imagePath: "humanoid/humanoid2.png",
        labels: ["Hand Pose", "Object States", "On-demand"],
      },
      {
        title: "Food prep and plating",
        description: "Fine-grained manipulations that emphasize tool handling, object transfer, and repeatable grasp cues.",
        imagePath: "humanoid/humanoid1.png",
        labels: ["Task Labels", "Hand Pose", "In Library"],
      },
      {
        title: "Appliance operation",
        description: "Knobs, doors, and cycle interactions where object-state understanding matters as much as hand position.",
        imagePath: "humanoid/humanoid5.png",
        labels: ["Appliance States", "Dexterity", "In Library"],
      },
    ],
  },
  {
    eyebrow: "Household Tasks",
    title: "Everyday manipulation patterns that translate into humanoid training signals.",
    description:
      "Everyday manipulation examples make the product concrete by showing the variety of hand-object interactions a humanoid system must learn to handle.",
    cards: [
      {
        title: "Surface cleaning and wiping",
        description: "Contact-rich repetitive motion for cloth, sponge, and utensil-based actions.",
        imagePath: "humanoid/humanoid3.png",
        labels: ["Wet Conditions", "Task Labels", "In Library"],
      },
      {
        title: "Laundry load and fold",
        description: "Deformable-object handling with sequencing that matters for execution consistency.",
        imagePath: "humanoid/humanoid5.png",
        labels: ["Object States", "Edge Cases", "In Library"],
      },
      {
        title: "Object organization",
        description: "Structured hand-object placement and retrieval patterns for home and service scenarios.",
        imagePath: "humanoid/humanoid4.png",
        labels: ["Task Labels", "Pose", "On-demand"],
      },
    ],
  },
];

function PreviewCard({ card }: { card: GalleryCard }) {
  const src = frontPageImageUrl(card.imagePath);

  return (
    <article className="marketing-surface overflow-hidden rounded-[24px]">
      <div className="aspect-[5/4] overflow-hidden bg-slate-100">
        {src ? (
          <img src={src} alt={card.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Image unavailable</div>
        )}
      </div>
      <div className="border-t border-slate-200 p-5">
        <h3 className="text-lg font-extrabold text-slate-950">{card.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {card.labels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function RoboHandMotion() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="marketing-hero-product border-b border-slate-200 px-4 py-14 sm:px-6 md:py-18">
          <div className="mx-auto max-w-[1300px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
              Patented IP
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-violet-200 bg-white text-violet-700">
                <Hand className="h-6 w-6" />
              </div>
              <h1 className="text-[clamp(2.7rem,5vw,4.8rem)] font-black tracking-[-0.06em] text-slate-950">
                RoboHandMotion
              </h1>
            </div>
            <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600">
              Patented pipeline capturing hand pose, tool interactions, and object states for
              dexterous robot training across household, kitchen, and service environments where
              contact fidelity and temporal structure directly affect execution quality.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                Hand pose
              </span>
              <span className="rounded-full border border-sky-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-sky-700">
                Tool interactions
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                Object states
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/80 px-4 py-8 sm:px-6">
          <div className="mx-auto grid max-w-[1300px] gap-4 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="marketing-surface rounded-[20px] px-5 py-5 text-center">
                <div className="text-xl font-black tracking-[-0.04em] text-slate-950">{stat.value}</div>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1300px] px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-violet-200 bg-violet-50 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
              How It Works
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <article key={step.title} className={`rounded-[24px] border p-6 ${step.accentClassName}`}>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em]">{step.step}</div>
                <div className="mt-4 text-xl font-black tracking-[-0.04em]">{step.title}</div>
                <p className="mt-4 text-sm leading-7 text-slate-700">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/70 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1300px] space-y-14">
            {SHOWCASE_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-3 rounded-full border border-violet-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
                    <Sparkles className="h-4 w-4" />
                    {section.eyebrow}
                  </div>
                  <h2 className="mt-5 text-[clamp(1.8rem,3vw,2.6rem)] font-black tracking-[-0.05em] text-slate-950">
                    {section.title}
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{section.description}</p>
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  {section.cards.map((card) => (
                    <PreviewCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="marketing-cta-product px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-[1300px] gap-8 rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                <Wrench className="h-4 w-4" />
                Request access
              </div>
              <h2 className="mt-5 text-[clamp(1.8rem,2.8vw,2.4rem)] font-black tracking-[-0.05em] text-slate-950">
                Run RoboHandMotion on your footage.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Already have hand-task footage? We&apos;ll generate pose sequences, contact cues,
                and manipulation-ready outputs across any task, environment, or robot form factor.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
              <Link
                to={buildAuthPath("register", "/robohandmotion")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Get Access
              </Link>
              <Link
                to="/robodatahub/dexterity"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
              >
                Explore dexterity data
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
