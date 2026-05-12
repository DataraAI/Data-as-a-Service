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
    tone: "border-blue-400/30 bg-blue-400/12 text-blue-300",
  },
  {
    initials: "NR",
    name: "Niraj Rai",
    role: "Co-Founder & CTO",
    bio: "Serial entrepreneur. Founder SproutsAi. Ex-CTO Vimaan (AI/Robotics). Software & AI expert. IIT Kharagpur.",
    tone: "border-primary/30 bg-primary/12 text-primary",
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

export default function Company() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="border-b border-white/6 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <div className="max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Company
              </div>
              <h1 className="mt-4 text-[clamp(2.4rem,4.8vw,3.9rem)] font-black tracking-[-0.05em] text-white">
                Built by PhysicalAI Veterans.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                40+ years of combined expertise from NVIDIA, IIT, and deep robotics - building
                the data infrastructure Physical AI demands.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[4px] bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.55)]" />
              <div className="text-2xl font-extrabold text-white">Founders</div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Serial entrepreneurs with deep roots in NVIDIA, AI, and robotics infrastructure.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {FOUNDERS.map((founder) => (
              <article
                key={founder.name}
                className="rounded-[24px] border border-white/6 bg-[#0d1014] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
              >
                <div className="flex gap-4">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border text-sm font-black ${founder.tone}`}
                  >
                    {founder.initials}
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-white">{founder.name}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {founder.role}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{founder.bio}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mb-10 mt-14">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[4px] bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.55)]" />
              <div className="text-2xl font-extrabold text-white">Advisors</div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Senior leaders from NVIDIA, Intel, and leading robotics institutions.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ADVISORS.map((advisor) => (
              <article
                key={advisor.name}
                className="rounded-[20px] border border-white/6 bg-[#0d1014] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-xs font-black text-primary">
                  {advisor.initials}
                </div>
                <div className="mt-4 text-sm font-bold text-white">{advisor.name}</div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">{advisor.role}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,#050e0a_0%,#060c14_50%,#04080f_100%)] px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[clamp(1.75rem,2.6vw,2.25rem)] font-extrabold tracking-tight text-white">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Join leading robotics companies using DataraAI&apos;s real-world data to achieve
              95%+ precision.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={buildAuthPath("register", "/viewer")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
              >
                Get Access
              </Link>
              <Link
                to="/viewer"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 px-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
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
