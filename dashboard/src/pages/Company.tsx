import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";

type Founder = {
  initials: string;
  name: string;
  role: string;
  bio: string;
  tone: string;
  tags: { label: string; tone: string }[];
};

type Advisor = {
  initials: string;
  name: string;
  role: string;
};

const FOUNDERS: Founder[] = [
  {
    initials: "DS",
    name: "Durgesh Srivastava",
    role: "Co-Founder & CEO",
    bio: "Serial entrepreneur (exited MIPS). Ex-NVIDIA Sr. Director AI & Robotics. Omniverse, Systems, LLM expert. IIT Kanpur.",
    tone: "border-blue-300 bg-blue-50 text-blue-700",
    tags: [
      { label: "NVIDIA", tone: "border-blue-200 bg-blue-50 text-blue-700" },
      { label: "IIT Kanpur", tone: "border-blue-200 bg-blue-50 text-blue-700" },
      { label: "LLM", tone: "border-teal-200 bg-teal-50 text-primary" },
      { label: "Omniverse", tone: "border-teal-200 bg-teal-50 text-primary" },
    ],
  },
  {
    initials: "NR",
    name: "Niraj Rai",
    role: "Co-Founder & CTO",
    bio: "Serial entrepreneur. Founder SproutsAi. Ex-CTO Vimaan (AI/Robotics). Software & AI expert. IIT Kharagpur.",
    tone: "border-teal-300 bg-teal-50 text-primary",
    tags: [
      { label: "SproutsAi", tone: "border-teal-200 bg-teal-50 text-primary" },
      { label: "Vimaan", tone: "border-teal-200 bg-teal-50 text-primary" },
      { label: "IIT Kharagpur", tone: "border-blue-200 bg-blue-50 text-blue-700" },
    ],
  },
];

const ADVISORS: Advisor[] = [
  { initials: "BK", name: "Brian Kelleher", role: "Sr. VP NVIDIA · Angel Investor" },
  { initials: "TG", name: "Dr. Teck Joo Goh", role: "Angel Investor · Corporate VP SkyeChip · ex-GM Intel" },
  { initials: "AR", name: "Dr. Amit Roy-Chowdhury", role: "Professor & UC Presidential Chair · Chair Robotics, UC Riverside" },
  { initials: "LA", name: "Lomesh Agarwal", role: "VP Software Apptronik · Ex-MagicLeap" },
];

export default function Company() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="mx-auto max-w-[1300px] border-b border-slate-200 px-4 py-16 sm:px-6">
          <div className="flex items-center gap-4 text-[18px] font-extrabold uppercase tracking-[0.18em] text-primary sm:text-xl">
            <span className="h-px w-12 bg-primary/45" />
            Company
            <span className="h-px w-12 bg-primary/45" />
          </div>
          <h1 className="marketing-display-title mt-4 text-[clamp(36px,4vw,52px)] font-black leading-[1.08] tracking-[-0.03em] text-slate-950">
            Built by PhysicalAI
            <br />
            <span className="bg-gradient-to-r from-primary to-sky-600 bg-clip-text text-transparent">Veterans.</span>
          </h1>
          <p className="mt-4 max-w-[580px] text-[17px] leading-[1.7] text-slate-500">
            40+ years of combined expertise from NVIDIA, IIT, and deep robotics — building the data infrastructure Physical AI demands.
          </p>
        </section>

        <section className="border-b border-slate-200 bg-background px-4 py-9 sm:px-6">
          <div className="mx-auto grid max-w-[1300px] md:grid-cols-3">
            <div className="py-5 md:pr-8">
              <div className="text-[17px] font-extrabold tracking-[-0.01em] text-slate-950">Real-World First</div>
              <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">
                Authentic multi-modal datasets captured in operating environments — not simulated proxies.
              </p>
            </div>
            <div className="border-t border-slate-200 py-5 md:border-l md:border-t-0 md:px-8">
              <div className="text-[17px] font-extrabold tracking-[-0.01em] text-slate-950">Data Infrastructure</div>
              <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">
                End-to-end pipelines from capture to policy-ready training data across four industry verticals.
              </p>
            </div>
            <div className="border-t border-slate-200 py-5 md:border-l md:border-t-0 md:pl-8">
              <div className="text-[17px] font-extrabold tracking-[-0.01em] text-slate-950">Partnership-Driven</div>
              <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">
                Co-developed with industry leaders — Figure AI, BMW, Foxconn — to ensure real production fidelity.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1300px] px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-3 w-3 rounded-[3px] bg-violet-700" />
            <div className="text-xl font-extrabold text-slate-950">Founders</div>
          </div>
          <p className="-mt-4 mb-8 text-[13px] text-slate-500">
            Serial entrepreneurs with deep roots in NVIDIA, AI, and robotics infrastructure.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {FOUNDERS.map((founder) => (
              <article key={founder.name} className="marketing-surface rounded-[14px] p-6">
                <div className="flex items-start gap-4">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-[12px] border text-lg font-extrabold ${founder.tone}`}>
                    {founder.initials}
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-slate-950">{founder.name}</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.04em] text-primary">
                      {founder.role}
                    </div>
                    <p className="mt-3 text-[12px] leading-6 text-slate-500">{founder.bio}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {founder.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tag.tone}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mb-8 mt-10 flex items-center gap-3">
            <div className="h-3 w-3 rounded-[3px] bg-blue-700" />
            <div className="text-xl font-extrabold text-slate-950">Advisors</div>
          </div>
          <p className="-mt-4 mb-8 text-[13px] text-slate-500">
            Senior leaders from NVIDIA, Intel, and leading robotics institutions.
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ADVISORS.map((advisor) => (
              <article key={advisor.name} className="marketing-surface rounded-[12px] p-5">
                <div className="grid h-9 w-9 place-items-center rounded-[8px] border border-primary/20 bg-primary/10 text-xs font-black text-primary">
                  {advisor.initials}
                </div>
                <div className="mt-4 text-[12px] font-bold text-slate-950">{advisor.name}</div>
                <div className="mt-2 text-[10px] leading-5 text-slate-500">{advisor.role}</div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
