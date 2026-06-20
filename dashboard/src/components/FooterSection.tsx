import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "RoboDataHub", to: "/robodatahub" },
  { label: "RoboAnnotator", to: "/roboannotator" },
  { label: "RoboHandMotion", to: "/robohandmotion" },
  { label: "RoboTaskManipulator", to: "/robotaskmanipulator" },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/90">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(260px,1.15fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-xl">
            <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Dataset infrastructure and synthesis tooling for dexterity, automotive, warehouse,
              and data-center robotics workflows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
            <div>
              <Link
                to="/#products"
                className="text-sm font-extrabold text-slate-950 transition-colors hover:text-primary"
              >
                Products
              </Link>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {PRODUCT_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-slate-500 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <Link
                to="/#solutions"
                className="text-sm font-extrabold text-slate-950 transition-colors hover:text-primary"
              >
                Use Cases
              </Link>
            </div>

            <div>
              <Link
                to="/#customers"
                className="text-sm font-extrabold text-slate-950 transition-colors hover:text-primary"
              >
                Customers
              </Link>
            </div>

            <div>
              <Link
                to="/company"
                className="text-sm font-extrabold text-slate-950 transition-colors hover:text-primary"
              >
                Company
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>&copy; 2026 DataraAI - NVIDIA Inception Member</div>
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
