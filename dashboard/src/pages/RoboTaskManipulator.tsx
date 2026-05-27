import { Boxes, ClipboardList, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

type TaskStep = {
  step: string;
  title: string;
  description: string;
  accentClassName: string;
};

type TaskCard = {
  title: string;
  description: string;
  imagePath: string;
  demoLabel: string;
  sequenceLabels: string[];
  chipLabels: string[];
};

type TaskSection = {
  eyebrow: string;
  title: string;
  description: string;
  cards: TaskCard[];
};

const STATS = [
  { value: "Task graphs", label: "Ordered manipulation steps" },
  { value: "Assembly", label: "Production workflows" },
  { value: "Warehouse", label: "Material handling" },
  { value: "Cabling", label: "Data-center routines" },
];

const TASK_STEPS: TaskStep[] = [
  {
    step: "Step 01",
    title: "Capture task demonstrations",
    description:
      "Start with real assembly, pick-place, or cabling workflows so the model sees the operation the way production teams do.",
    accentClassName: "border-blue-200 bg-blue-50 text-sky-700",
  },
  {
    step: "Step 02",
    title: "Run the task-manipulator engine",
    description:
      "Break the workflow into ordered phases, manipulation primitives, and state transitions that can feed execution models instead of staying as raw footage.",
    accentClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    step: "Step 03",
    title: "Train on sequence-aware outputs",
    description:
      "Use step-segmented task sequences that are closer to how production robots need to reason about multi-stage execution.",
    accentClassName: "border-teal-200 bg-teal-50 text-primary",
  },
];

const TASK_SECTIONS: TaskSection[] = [
  {
    eyebrow: "Warehouse",
    title: "Pick-place and material-handling workflows with explicit sequence structure.",
    description:
      "Show the action stages that emerge from one captured workflow instead of flattening complex multi-step execution into a simple gallery of scenes.",
    cards: [
      {
        title: "Pick & place shelf interaction",
        description: "Shelf reach, grasp, transfer, and place phases from a live warehouse workflow.",
        imagePath: "warehouse/warehouse2.png",
        demoLabel: "Task demo",
        sequenceLabels: ["Approach", "Grasp", "Transport", "Place"],
        chipLabels: ["Task Labels", "In Library", "Warehouse"],
      },
      {
        title: "Pallet stacking and transport",
        description: "Layered stacking motions that benefit from ordered stage boundaries and repeatable task structure.",
        imagePath: "warehouse/warehouse1.png",
        demoLabel: "Task demo",
        sequenceLabels: ["Lift", "Align", "Stack", "Secure"],
        chipLabels: ["Workflow", "In Library", "Pallet"],
      },
    ],
  },
  {
    eyebrow: "Assembly + Data Center",
    title: "Workflow-aware representations for assembly and rack-side operations.",
    description:
      "Task intelligence matters most when perception, manipulation, and environment state need to stay aligned across more than one step.",
    cards: [
      {
        title: "Front grille assembly",
        description: "Assembly-line workflow structure for fitment, alignment, fastening, and inspection handoff.",
        imagePath: "carAutomation/carAutomation2.png",
        demoLabel: "Assembly demo",
        sequenceLabels: ["Locate", "Align", "Attach", "Verify"],
        chipLabels: ["Assembly", "Automotive", "On-demand"],
      },
      {
        title: "Rack cabling and patch panel",
        description: "Multi-step cabling task structure that combines routing, placement, and verification inside the same sequence.",
        imagePath: "serverrack/serverrack1.png",
        demoLabel: "Rack demo",
        sequenceLabels: ["Route", "Insert", "Dress", "Verify"],
        chipLabels: ["Cabling", "Data Center", "In Library"],
      },
    ],
  },
];

function TaskPreviewCard({ card }: { card: TaskCard }) {
  const src = frontPageImageUrl(card.imagePath);

  return (
    <article className="marketing-surface overflow-hidden rounded-[24px]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="aspect-[5/4] overflow-hidden bg-slate-100">
            {src ? (
              <img src={src} alt={card.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Image unavailable</div>
            )}
          </div>
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">{card.demoLabel}</div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-extrabold text-slate-950">{card.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {card.sequenceLabels.map((label) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-[16px] border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm font-bold text-amber-800"
              >
                <span className="absolute left-3 top-3 rounded-full bg-amber-600 px-2 py-0.5 text-[8px] uppercase tracking-[0.16em] text-white">
                  Task
                </span>
                <span className="mt-4 block pt-4">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {card.chipLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RoboTaskManipulator() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="marketing-hero-product border-b border-slate-200 px-4 py-14 sm:px-6 md:py-18">
          <div className="mx-auto max-w-[1300px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
              Task Intelligence
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] border border-amber-200 bg-white text-amber-700">
                <Workflow className="h-6 w-6" />
              </div>
              <h1 className="text-[clamp(2.7rem,5vw,4.8rem)] font-black tracking-[-0.06em] text-slate-950">
                RoboTaskManipulator
              </h1>
            </div>
            <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600">
              End-to-end assembly, pick-place, and cabling workflow datasets that are step-segmented
              and ready for imitation learning and policy training across assembly, logistics, and
              infrastructure operations where ordered task execution matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                Step sequences
              </span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Manipulation primitives
              </span>
              <span className="rounded-full border border-sky-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-sky-700">
                Workflow intelligence
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
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
              <ClipboardList className="h-4 w-4" />
              How it works
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {TASK_STEPS.map((step) => (
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
            {TASK_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                    <Boxes className="h-4 w-4" />
                    {section.eyebrow}
                  </div>
                  <h2 className="mt-5 text-[clamp(1.8rem,3vw,2.6rem)] font-black tracking-[-0.05em] text-slate-950">
                    {section.title}
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{section.description}</p>
                </div>
                <div className="grid gap-5">
                  {section.cards.map((card) => (
                    <TaskPreviewCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="marketing-cta-product px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-[1300px] gap-8 rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                <Workflow className="h-4 w-4" />
                Request access
              </div>
              <h2 className="mt-5 text-[clamp(1.8rem,2.8vw,2.4rem)] font-black tracking-[-0.05em] text-slate-950">
                Run RoboTaskManipulator on your workflow.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Have assembly, pick-place, or cabling footage? We&apos;ll generate step-segmented
                task sequences with explicit manipulation stages across your operating environment.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
              <Link
                to={buildAuthPath("register", "/robotaskmanipulator")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Get Access
              </Link>
              <Link
                to="/robodatahub/warehouse"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
              >
                Explore task data
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
