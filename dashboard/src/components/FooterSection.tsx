import { Link, useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { buildAuthPath } from "@/lib/authLinks";

const MARKETING_FOOTER_LINKS = [
  { label: "Products", to: "/#products" },
  { label: "Solutions", to: "/#solutions" },
  { label: "Customers", to: "/#customers" },
  { label: "Company", to: "/company" },
];

const PRODUCT_FOOTER_LINKS = [
  { label: "Home", to: "/" },
  { label: "RoboDataHub", to: "/robodatahub" },
  { label: "RoboAnnotator", to: "/roboannotator" },
  { label: "RoboHandMotion", to: "/robohandmotion" },
  { label: "RoboTaskManipulator", to: "/robotaskmanipulator" },
];

export default function FooterSection() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const signInHref = buildAuthPath("login", currentPath || "/");
  const isProductFooter =
    location.pathname.startsWith("/robodatahub") ||
    location.pathname.startsWith("/viewer") ||
    location.pathname.startsWith("/roboannotator") ||
    location.pathname.startsWith("/roboeyeview") ||
    location.pathname.startsWith("/robohandmotion") ||
    location.pathname.startsWith("/robotaskmanipulator");
  const footerLinks = isProductFooter ? PRODUCT_FOOTER_LINKS : MARKETING_FOOTER_LINKS;

  return (
    <footer className="border-t border-slate-200 bg-slate-50/90">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Dataset infrastructure and synthesis tooling for dexterity, automotive, warehouse,
              and data-center robotics workflows.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-slate-500 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="text-slate-500 transition-colors hover:text-foreground"
              >
                Sign Out
              </button>
            ) : (
              <Link to={signInHref} className="text-slate-500 transition-colors hover:text-foreground">
                Sign In
              </Link>
            )}
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
