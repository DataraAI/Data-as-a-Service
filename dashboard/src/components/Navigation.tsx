import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Database, LogOut, Menu, Moon, Shield, Sun, X } from "lucide-react";
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
}: {
  canManageUsers: boolean;
  hasPrivateData: boolean | null;
}) {
  const { isApproved, user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useAppTheme();
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
        className="w-[280px] rounded-2xl border-slate-200 bg-white p-2 shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
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

        <DropdownMenuItem
          className="cursor-pointer rounded-xl px-3 py-2.5 font-semibold text-slate-600"
          onSelect={toggleTheme}
        >
          {isDarkMode ? <Sun className="mr-3 h-4 w-4 text-primary" /> : <Moon className="mr-3 h-4 w-4 text-primary" />}
          {isDarkMode ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>

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
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { isAuthenticated, isApproved, user } = useAuth();

  const currentPath = `${location.pathname}${location.search}`;
  const loginHref = buildAuthPath("login", currentPath);
  const registerHref = buildAuthPath("register", currentPath);
  const canManageUsers =
    isAuthenticated && isApproved && user?.role === "admin";
  const isMarketingNav = location.pathname === "/" || location.pathname === "/company";
  const [hasPrivateData, setHasPrivateData] = useState<boolean | null>(null);

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
            {isAuthenticated ? (
              <AccountMenu canManageUsers={canManageUsers} hasPrivateData={hasPrivateData} />
            ) : (
              <>
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
            {isAuthenticated ? (
              <AccountMenu canManageUsers={canManageUsers} hasPrivateData={hasPrivateData} />
            ) : (
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
            )}

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

            {!isAuthenticated && (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
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
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
