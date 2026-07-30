import { ArrowUp } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "RoboDataHub", to: "/robodatahub" },
  { label: "RoboAnnotator", to: "/roboannotator" },
  { label: "RoboHandMotion", to: "/robohandmotion" },
  { label: "RoboTaskManipulator", to: "/robotaskmanipulator" },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-slate-200 bg-card">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span>&copy; 2025 DataraAI - NVIDIA Inception Member</span>
            <a
              href="mailto:durgesh@dataraai.ai"
              title="durgesh@dataraai.ai"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-[13px] font-extrabold text-primary-foreground shadow-[0_4px_14px_rgba(13,148,136,0.2)] transition-all hover:opacity-90 hover:-translate-y-0.5"
            >
              Contact Us
            </a>
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-primary"
          >
            Back to top
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
