import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";

type TeamMember = {
  initials: string;
  name: string;
  role: string;
  bio: string;
  tone: string;
};

type Advisor = {
  initials: string;
  name: string;
  role: string;
};

const FOUNDERS: TeamMember[] = [
  {
    initials: "DS",
    name: "Durgesh Srivastava",
    role: "Co-Founder & CEO",
    bio: "Serial entrepreneur (exited MIPS). Ex-NVIDIA Sr. Director AI & Robotics. Omniverse, Systems, LLM expert. IIT Kanpur.",
    tone: "border-blue-200 bg-blue-50 text-sky-700",
  },
  {
    initials: "NR",
    name: "Niraj Rai",
    role: "Co-Founder & CTO",
    bio: "Serial entrepreneur. Founder SproutsAi. Ex-CTO Vimaan (AI/Robotics). Software & AI expert. IIT Kharagpur.",
    tone: "border-teal-200 bg-teal-50 text-primary",
  },
];

const ADVISORS: Advisor[] = [
  {
    initials: "BK",
    name: "Brian Kelleher",
    role: "Sr. VP NVIDIA - Angel Investor",
  },
  {
    initials: "TG",
    name: "Dr. Teck Joo Goh",
    role: "Angel Investor - Corporate VP SkyeChip - ex-GM Intel",
  },
  {
    initials: "AR",
    name: "Dr. Amit Roy-Chowdhury",
    role: "Professor & UC Presidential Chair - Chair Robotics, UC Riverside",
  },
  {
    initials: "LA",
    name: "Lomesh Agarwal",
    role: "VP Software Apptronik - Ex-MagicLeap",
  },
];

const CREDENTIALS = [
  "NVIDIA Inception Member",
  "Figure AI Partner",
  "BMW Robotics Partner",
  "Foxconn Smart Factory",
  "Peer Robotics Customer",
];

export default function Company() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="marketing-hero-company border-b border-slate-200 px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-[1440px]">
            <div className="max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Company
              </div>
              <h1 className="mt-4 text-[clamp(2.5rem,4.9vw,4rem)] font-black tracking-[-0.05em] text-slate-950">
                Built by PhysicalAI Veterans.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                40+ years of combined expertise from NVIDIA, IIT, and deep robotics - building
                the data infrastructure Physical AI demands.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/80 px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-3">
            <div className="marketing-surface rounded-[22px] p-6">
              <div className="text-sm font-extrabold text-slate-950">Real-World First</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Authentic multi-modal datasets captured in operating environments instead of
                simulation-only approximations.
              </p>
            </div>
            <div className="marketing-surface rounded-[22px] p-6">
              <div className="text-sm font-extrabold text-slate-950">Data Infrastructure</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                End-to-end pipelines from capture to policy-ready training data across active
                robotics sectors.
              </p>
            </div>
            <div className="marketing-surface rounded-[22px] p-6">
              <div className="text-sm font-extrabold text-slate-950">Partnership-Driven</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Co-developed with industry teams to match the fidelity and pace real deployment
                programs demand.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[4px] bg-violet-500" />
              <div className="text-2xl font-extrabold text-slate-950">Founders</div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Serial entrepreneurs with deep roots in NVIDIA, AI, and robotics infrastructure.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {FOUNDERS.map((founder) => (
              <article
                key={founder.name}
                className="marketing-surface rounded-[24px] p-6"
              >
                <div className="flex gap-4">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border text-sm font-black ${founder.tone}`}
                  >
                    {founder.initials}
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-slate-950">{founder.name}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {founder.role}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{founder.bio}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mb-10 mt-14">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[4px] bg-sky-700" />
              <div className="text-2xl font-extrabold text-slate-950">Advisors</div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Senior leaders from NVIDIA, Intel, and leading robotics institutions.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ADVISORS.map((advisor) => (
              <article
                key={advisor.name}
                className="marketing-surface rounded-[20px] p-5"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-xs font-black text-primary">
                  {advisor.initials}
                </div>
                <div className="mt-4 text-sm font-bold text-slate-950">{advisor.name}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{advisor.role}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/90 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <div className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Recognized and backed by
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {CREDENTIALS.map((credential) => (
                <div
                  key={credential}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.05)]"
                >
                  {credential}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-cta-shared px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[clamp(1.75rem,2.7vw,2.3rem)] font-extrabold tracking-tight text-slate-950">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Join robotics teams using DataraAI&apos;s real-world data to move faster from capture
              to deployable models.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={buildAuthPath("register", "/robodatahub")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Get Access
              </Link>
              <Link
                to="/robodatahub"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
              >
                Explore RoboDataHub
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
