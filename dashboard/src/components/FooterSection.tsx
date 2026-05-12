import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { buildAuthPath } from "@/lib/authLinks";

const FOOTER_LINKS = [
  { label: "Home", to: "/" },
  { label: "Solutions", to: "/product" },
  { label: "RoboDataHub", to: "/viewer" },
  { label: "RoboEyeView", to: "/roboeyeview" },
  { label: "Explore Datasets", to: "/explore" },
  { label: "Company", to: "/company" },
  { label: "Sign In", to: buildAuthPath("login", "/viewer") },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-white/6 bg-[#040608]">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Dataset infrastructure and synthesis tooling for humanoid, automotive, warehouse,
              and data-center robotics workflows.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/6 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>&copy; 2026 DataraAI - NVIDIA Inception Member</div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            Back to top
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
