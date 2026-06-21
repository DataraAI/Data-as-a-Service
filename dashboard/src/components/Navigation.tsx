import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Check, ChevronDown, Database, LogOut, Menu, Moon, Shield, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/useAuth";
import type { AuthUser } from "@/auth/AuthProvider";
import dataraAILogo from "@/assets/images/logo/DataraAILogo.png";
import { buildAuthPath } from "@/lib/authLinks";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { JobsPanel } from "./JobsPanel";

type NavItem = {
  label: string;
  href: string;
  key: string;
};

const GLOBAL_NAV_ITEMS: NavItem[] = [
  { key: "products", label: "Products", href: "/#products" },
  { key: "solutions", label: "Use Cases", href: "/#solutions" },
  { key: "customers", label: "Customers", href: "/#customers" },
  { key: "company", label: "Company", href: "/company" },
];

const HOME_SECTION_KEYS = ["products", "solutions", "customers"] as const;
type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

const PRODUCT_NAV_ITEMS: Array<NavItem & { subtitle: string }> = [
  {
    key: "robodatahub",
    label: "RoboDataHub",
    subtitle: "Dataset Catalog",
    href: "/robodatahub",
  },
  {
    key: "roboeyeview",
    label: "RoboAnnotator",
    subtitle: "Visual Intelligence",
    href: "/roboannotator",
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

function ProductMenu({
  activeProductKey,
  align = "start",
  onNavigate,
  triggerClassName,
}: {
  activeProductKey: string | null;
  align?: "start" | "end";
  onNavigate?: () => void;
  triggerClassName: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`group/product-menu ${triggerClassName}`}
          aria-label="Open product menu"
          title="Explore products"
        >
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/product-menu:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={10}
        className="w-[calc(100vw-2rem)] max-w-[320px] rounded-2xl border-slate-200 bg-card p-2 shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
      >
        <div className="px-3 pb-2 pt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Products
          </div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500">
            Move directly between DataraAI products.
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-slate-200" />

        {PRODUCT_NAV_ITEMS.map((product) => {
          const isCurrent = activeProductKey === product.key;

          return (
            <DropdownMenuItem
              key={product.key}
              asChild
              className={`cursor-pointer rounded-xl px-3 py-2.5 ${
                isCurrent
                  ? "bg-primary/6 text-primary focus:bg-primary/10 focus:text-primary"
                  : "text-slate-600 focus:bg-slate-50 focus:text-slate-950"
              }`}
            >
              <Link to={product.href} onClick={onNavigate} aria-current={isCurrent ? "page" : undefined}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{product.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] opacity-65">
                    {product.subtitle}
                  </span>
                </span>
                {isCurrent && <Check className="ml-3 h-4 w-4 shrink-0" />}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getUserInitials(user: AuthUser | null) {
  const displayName = user?.displayName?.trim();
  const source = displayName || user?.email?.split("@")[0] || "User";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function AccountMenu({
  canManageUsers,
  hasPrivateData,
  canViewJobs,
  onOpenJobs,
}: {
  canManageUsers: boolean;
  hasPrivateData: boolean | null;
  canViewJobs: boolean;
  onOpenJobs: () => void;
}) {
  const { isApproved, user, logout } = useAuth();
  const privateDataAvailable = isApproved && hasPrivateData !== false;
  const roleLabel = isApproved ? user?.role ?? "customer" : "pending approval";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary p-0 text-[12px] font-black tracking-[0.04em] text-primary-foreground shadow-[0_12px_26px_rgba(13,148,136,0.22)] hover:bg-primary hover:text-primary-foreground"
          aria-label="Open account menu"
          title="Account menu"
        >
          {getUserInitials(user)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[280px] rounded-2xl border-slate-200 bg-card p-2 shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
      >
        <div className="px-3 py-3">
          <div className="truncate text-sm font-extrabold text-slate-950">
            {user?.displayName ?? user?.email}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {roleLabel}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-slate-200" />

        {canManageUsers && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-slate-600">
            <Link to="/admin/users">
              <Shield className="mr-3 h-4 w-4 text-primary" />
              User Access
            </Link>
          </DropdownMenuItem>
        )}

        {canViewJobs && (
          <DropdownMenuItem
            className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-slate-600"
            onSelect={onOpenJobs}
          >
            <BriefcaseBusiness className="mr-3 h-4 w-4 text-primary" />
            Jobs
          </DropdownMenuItem>
        )}

        {privateDataAvailable ? (
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-slate-600">
            <Link to="/viewer/my">
              <Database className="mr-3 h-4 w-4 text-primary" />
              Private data
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="rounded-xl px-3 py-2.5 font-semibold text-slate-500">
            <Database className="mr-3 h-4 w-4" />
            No private data yet
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1 bg-slate-200" />

        <DropdownMenuItem
          className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-slate-600 focus:bg-red-50 focus:text-red-700"
          onSelect={() => void logout()}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHomeSectionKey, setActiveHomeSectionKey] = useState<HomeSectionKey | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { isAuthenticated, isApproved, user } = useAuth();

  const currentPath = `${location.pathname}${location.search}`;
  const loginHref = buildAuthPath("login", currentPath);
  const registerHref = buildAuthPath("register", currentPath);
  const canManageUsers =
    isAuthenticated && isApproved && user?.role === "admin";
  const canViewJobs = isAuthenticated && isApproved;
  const canViewJobHistory = user?.role === "admin" || user?.role === "analyst";
  const isMarketingPage = location.pathname === "/" || location.pathname === "/company";
  const [hasPrivateData, setHasPrivateData] = useState<boolean | null>(null);
  const [jobsOpen, setJobsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isApproved) {
      setHasPrivateData(false);
      return;
    }

    let cancelled = false;

    async function checkPrivateData() {
      try {
        const response = await fetch("/api/datasets?path=my", { credentials: "same-origin" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setHasPrivateData(Array.isArray(data) && data.length > 0);
        }
      } catch {
        if (!cancelled) {
          setHasPrivateData(null);
        }
      }
    }

    setHasPrivateData(null);
    void checkPrivateData();

    return () => {
      cancelled = true;
    };
  }, [isApproved, isAuthenticated, user?.id]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveHomeSectionKey(null);
      return;
    }

    let animationFrame = 0;

    const updateActiveHomeSection = () => {
      animationFrame = 0;
      const headerMarker = 112;
      const activeSection = HOME_SECTION_KEYS.find((sectionKey) => {
        const section = document.getElementById(sectionKey);
        if (!section) return false;
        const bounds = section.getBoundingClientRect();
        return bounds.top <= headerMarker && bounds.bottom > headerMarker;
      });

      setActiveHomeSectionKey(activeSection ?? null);
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveHomeSection);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname]);

  const handleGlobalNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#") && location.pathname === "/") {
      event.preventDefault();
      const sectionId = href.slice(2);
      const target = document.getElementById(sectionId);

      if (location.hash !== `#${sectionId}`) {
        navigate(href);
      }
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (href === "/company" && location.pathname === "/company") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const activeProductKey = useMemo(() => {
    if (location.pathname.startsWith("/viewer") || location.pathname.startsWith("/robodatahub")) {
      return "robodatahub";
    }
    if (location.pathname.startsWith("/roboannotator") || location.pathname.startsWith("/roboeyeview")) {
      return "roboeyeview";
    }
    if (location.pathname.startsWith("/robohandmotion")) return "robohandmotion";
    if (location.pathname.startsWith("/robotaskmanipulator")) return "robotaskmanipulator";
    if (location.pathname === "/product" && location.hash === "#robohandmotion") {
      return "robohandmotion";
    }
    if (location.pathname === "/product" && location.hash === "#robotaskmanipulator") {
      return "robotaskmanipulator";
    }
    return null;
  }, [location.hash, location.pathname]);

  const activeNavKey = useMemo(() => {
    if (location.pathname === "/company") return "company";
    if (location.pathname === "/") return activeHomeSectionKey;
    if (
      activeProductKey ||
      location.pathname === "/product"
    ) {
      return "products";
    }
    return null;
  }, [activeHomeSectionKey, activeProductKey, location.pathname]);

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-card/95 text-foreground backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="relative flex h-[88px] items-center justify-between gap-4">
          <Link
            to="/"
            className="relative z-10 flex min-w-0 items-center gap-3"
            onClick={() => setIsMenuOpen(false)}
          >
            <img
              src={dataraAILogo}
              alt=""
              width={44}
              height={44}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-11 w-11 shrink-0 rounded-full border border-primary/20 object-cover shadow-[0_14px_30px_rgba(13,148,136,0.18)]"
            />
            <div className="min-w-0">
              <div className="truncate font-sans-tech text-lg font-extrabold tracking-[0.04em] text-primary">
                DataraAI
              </div>
              {!isMarketingPage ? (
                <div className="truncate text-[11px] font-medium text-slate-500">
                  Back to Home
                </div>
              ) : null}
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 items-stretch px-4 min-[1120px]:flex">
            <div className="flex min-w-0 flex-1 items-stretch">
              {GLOBAL_NAV_ITEMS.map((item) => {
                const isActive = activeNavKey === item.key;

                if (item.key === "products") {
                  return (
                    <div
                      key={item.key}
                      className={`relative flex min-w-0 flex-1 items-stretch border-x border-slate-200/80 text-center transition-colors ${
                        isActive
                          ? "bg-primary/5 text-primary"
                          : "text-slate-500 hover:bg-slate-50 hover:text-foreground"
                      }`}
                    >
                      <Link
                        to={item.href}
                        className="flex min-w-0 flex-1 flex-col items-center justify-center py-2 pl-4 pr-1"
                        onClick={(event) => handleGlobalNavClick(event, item.href)}
                      >
                        <span className="truncate text-[16px] font-bold leading-none">{item.label}</span>
                      </Link>
                      <div className="flex items-stretch py-1.5 pr-2">
                        <ProductMenu
                          activeProductKey={activeProductKey}
                          triggerClassName="h-full min-h-[52px] w-10 rounded-[14px] text-current hover:bg-card/80 hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
                        />
                      </div>
                      <span
                        className={`pointer-events-none absolute inset-x-[20%] bottom-0 h-0.5 rounded-t-full ${
                          isActive
                            ? "bg-primary shadow-[0_0_14px_rgba(13,148,136,0.3)]"
                            : "bg-transparent"
                        }`}
                      />
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    onClick={(event) => handleGlobalNavClick(event, item.href)}
                    className={`relative flex min-w-0 flex-1 flex-col items-center justify-center border-x border-slate-200/80 px-4 text-center transition-colors xl:px-5 ${
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-slate-500 hover:bg-slate-50 hover:text-foreground"
                      }`}
                  >
                    <span className="truncate text-[16px] font-bold leading-none">{item.label}</span>
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

          <div className="relative z-10 hidden items-center gap-3 min-[1120px]:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-slate-200 bg-card text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:border-primary/30 hover:text-primary"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <AccountMenu
                canManageUsers={canManageUsers}
                hasPrivateData={hasPrivateData}
                canViewJobs={canViewJobs}
                onOpenJobs={() => setJobsOpen(true)}
              />
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

          <div className="flex items-center gap-2 min-[1120px]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-card text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:text-primary"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {isAuthenticated ? (
              <AccountMenu
                canManageUsers={canManageUsers}
                hasPrivateData={hasPrivateData}
                canViewJobs={canViewJobs}
                onOpenJobs={() => setJobsOpen(true)}
              />
            ) : (
              null
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-card text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.04)] hover:text-primary"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 pb-5 pt-4 min-[1120px]:hidden">
            <div className="space-y-2">
              {GLOBAL_NAV_ITEMS.map((item) => {
                const isActive = activeNavKey === item.key;

                if (item.key === "products") {
                  return (
                    <div
                      key={item.key}
                      className={`flex items-stretch overflow-hidden rounded-2xl border ${
                        isActive
                          ? "border-primary/20 bg-primary/6 text-primary"
                          : "border-slate-200 bg-card text-slate-500"
                      }`}
                    >
                      <Link
                        to={item.href}
                        className="block min-w-0 flex-1 px-4 py-3"
                        onClick={(event) => {
                          setIsMenuOpen(false);
                          handleGlobalNavClick(event, item.href);
                        }}
                      >
                        <div className="text-sm font-semibold">{item.label}</div>
                      </Link>
                      <div className="flex items-stretch border-l border-current/10 px-2 py-1">
                        <ProductMenu
                          activeProductKey={activeProductKey}
                          align="end"
                          onNavigate={() => setIsMenuOpen(false)}
                          triggerClassName="h-full min-h-[48px] w-10 rounded-[14px] text-current hover:bg-card/80 hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={`block rounded-2xl border px-4 py-3 ${
                      isActive
                        ? "border-primary/20 bg-primary/6 text-primary"
                        : "border-slate-200 bg-card text-slate-500"
                    }`}
                    onClick={(event) => {
                      setIsMenuOpen(false);
                      handleGlobalNavClick(event, item.href);
                    }}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                  </Link>
                );
              })}
            </div>

            {!isAuthenticated && (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <Link
                  to={loginHref}
                  className="flex h-11 items-center rounded-2xl border border-slate-200 bg-card px-4 text-sm font-semibold text-slate-500"
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
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
    {canViewJobs && (
      <JobsPanel
        open={jobsOpen}
        onOpenChange={setJobsOpen}
        canViewHistory={canViewJobHistory}
      />
    )}
    </>
  );
}
