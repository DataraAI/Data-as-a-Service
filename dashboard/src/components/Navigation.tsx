import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";
import { buildAuthPath } from "@/lib/authLinks";
import { useAppTheme } from "@/theme/AppThemeProvider";

type NavItem = {
  label: string;
  subtitle: string;
  href: string;
  key: string;
};

const MARKETING_NAV_ITEMS: NavItem[] = [
  { key: "products", label: "Products", subtitle: "AI Data", href: "/#products" },
  { key: "solutions", label: "Solutions", subtitle: "Use Cases", href: "/#solutions" },
  { key: "customers", label: "Customers", subtitle: "Case Studies", href: "/#customers" },
  { key: "company", label: "Company", subtitle: "Team · Mission", href: "/company" },
];

const PRODUCT_NAV_ITEMS: NavItem[] = [
  {
    key: "robodatahub",
    label: "RoboDataHub",
    subtitle: "Dataset Catalog",
    href: "/robodatahub",
  },
  {
    key: "roboeyeview",
    label: "RoboEyeView",
    subtitle: "Visual Intelligence",
    href: "/roboeyeview",
  },
  {
    key: "robohandmotion",
    label: "RoboHandMotion",
    subtitle: "Dexterity Data",
    href: "/robohandmotion",
  },
  {
    key: "robotaskmanipulator",
    label: "RoboTaskManipulator",
    subtitle: "Task Execution",
    href: "/robotaskmanipulator",
  },
];

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { isAuthenticated, isApproved, user, logout } = useAuth();

  const currentPath = `${location.pathname}${location.search}`;
  const loginHref = buildAuthPath("login", currentPath);
  const registerHref = buildAuthPath("register", currentPath);
  const canManageUsers =
    isAuthenticated && isApproved && (user?.role === "admin" || user?.role === "analyst");
  const isMarketingNav = location.pathname === "/" || location.pathname === "/company";

  const navItems = useMemo(
    () => (isMarketingNav ? MARKETING_NAV_ITEMS : PRODUCT_NAV_ITEMS),
    [isMarketingNav],
  );
  const desktopNavDisplayClass = isMarketingNav ? "min-[1120px]:flex" : "min-[1220px]:flex";
  const desktopActionsClass = isMarketingNav ? "min-[1120px]:flex" : "min-[1220px]:flex";
  const mobileControlsClass = isMarketingNav ? "min-[1120px]:hidden" : "min-[1220px]:hidden";
  const tabSpacingClass = isMarketingNav ? "px-4 xl:px-5" : "px-3 xl:px-4";
  const tabLabelClass = isMarketingNav ? "text-[14px]" : "text-[13px] xl:text-[14px]";

  const activeNavKey = useMemo(() => {
    if (isMarketingNav) {
      if (location.pathname === "/company") return "company";
      if (location.hash === "#solutions") return "solutions";
      if (location.hash === "#customers") return "customers";
      if (location.hash === "#products" || location.pathname === "/") return "products";
      return null;
    }

    if (location.pathname.startsWith("/viewer") || location.pathname.startsWith("/robodatahub")) {
      return "robodatahub";
    }
    if (location.pathname.startsWith("/roboeyeview")) return "roboeyeview";
    if (location.pathname.startsWith("/robohandmotion")) return "robohandmotion";
    if (location.pathname.startsWith("/robotaskmanipulator")) return "robotaskmanipulator";
    if (location.pathname === "/product" && location.hash === "#robohandmotion") {
      return "robohandmotion";
    }
    if (location.pathname === "/product" && location.hash === "#robotaskmanipulator") {
      return "robotaskmanipulator";
    }
    return null;
  }, [isMarketingNav, location.hash, location.pathname]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/92 text-foreground backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="relative flex h-[88px] items-center justify-between gap-4">
          <Link
            to="/"
            className="relative z-10 flex min-w-0 items-center gap-3"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary text-[15px] font-black text-primary-foreground shadow-[0_14px_30px_rgba(13,148,136,0.18)]">
              D
            </div>
            <div className="min-w-0">
              <div className="truncate font-sans-tech text-lg font-extrabold tracking-[0.04em] text-primary">
                DataraAI
              </div>
              <div className="truncate text-[11px] font-medium text-slate-500">
                {isMarketingNav ? "Data-as-a-Service" : "Back to Home"}
              </div>
            </div>
          </Link>

          <div className={`hidden min-w-0 flex-1 items-stretch px-4 ${desktopNavDisplayClass}`}>
            <div className="flex min-w-0 flex-1 items-stretch">
              {navItems.map((item) => {
                const isActive = activeNavKey === item.key;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`relative flex min-w-0 flex-1 ${tabSpacingClass} flex-col items-center justify-center border-x border-slate-200/80 text-center transition-colors ${
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-slate-500 hover:bg-slate-50 hover:text-foreground"
                    }`}
                  >
                    <span className={`truncate font-bold leading-none ${tabLabelClass}`}>{item.label}</span>
                    <span className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
                      {item.subtitle}
                    </span>
                    <span
                      className={`absolute inset-x-[20%] bottom-0 h-0.5 rounded-t-full ${
                        isActive
                          ? "bg-primary shadow-[0_0_14px_rgba(13,148,136,0.3)]"
                          : "bg-transparent"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={`relative z-10 hidden items-center gap-3 ${desktopActionsClass}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:border-primary/30 hover:text-primary"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <>
                {canManageUsers && (
                  <Link
                    to="/admin/users"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    User Access
                  </Link>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {isApproved ? user?.role ?? "customer" : "pending"}
                  </div>
                  <div className="max-w-[220px] truncate text-sm text-foreground">
                    {user?.displayName ?? user?.email}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-10 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-500 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  onClick={() => void logout()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to={loginHref}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  Sign In
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(13,148,136,0.22)] transition-opacity hover:opacity-90"
                >
                  Get Access
                </Link>
              </>
            )}
          </div>

          <div className={`flex items-center gap-2 ${mobileControlsClass}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:text-primary"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:text-primary"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className={`border-t border-slate-200 pb-5 pt-4 ${mobileControlsClass}`}>
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = activeNavKey === item.key;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`block rounded-2xl border px-4 py-3 ${
                      isActive
                        ? "border-primary/20 bg-primary/6 text-primary"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-60">
                      {item.subtitle}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              {isAuthenticated ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {isApproved ? user?.role ?? "customer" : "pending"}
                    </div>
                    <div className="mt-1 truncate text-sm text-foreground">
                      {user?.displayName ?? user?.email}
                    </div>
                  </div>

                  {canManageUsers && (
                    <Link
                      to="/admin/users"
                      className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      User Access
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-start rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 hover:text-primary"
                    onClick={() => void logout()}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to={loginHref}
                    className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to={registerHref}
                    className="flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Access
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
