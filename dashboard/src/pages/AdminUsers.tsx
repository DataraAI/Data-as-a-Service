import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  XCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import AuthRequiredState from "@/components/AuthRequiredState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";
import type { AuthRole } from "@/auth/AuthProvider";

type ApprovalStatus = "pending" | "approved" | "rejected";

interface ManagedUser {
  id: number;
  email: string;
  displayName: string;
  role: AuthRole;
  approvalStatus: ApprovalStatus;
  isApproved: boolean;
  approvedByUserId: number | null;
  approvedByEmail: string | null;
  approvedByDisplayName: string | null;
  storageSlug: string;
  privateContainerName: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
}

const ROLE_OPTIONS: AuthRole[] = ["customer", "analyst", "admin"];

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error
        : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-5 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="font-sans-tech text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: AuthRole }) {
  const className =
    role === "admin"
      ? "border-primary/30 bg-primary/12 text-primary"
      : role === "analyst"
        ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
        : "border-border bg-background/70 text-muted-foreground";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>
      {role}
    </span>
  );
}

function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const className =
    status === "approved"
      ? "border-primary/30 bg-primary/12 text-primary"
      : status === "rejected"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-400/30 bg-amber-400/10 text-amber-300";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>
      {status}
    </span>
  );
}

export default function AdminUsers() {
  const { isLoading: authLoading, isAuthenticated, isApproved, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, AuthRole>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canManageUsers =
    Boolean(isAuthenticated) &&
    Boolean(isApproved) &&
    (user?.role === "admin" || user?.role === "analyst");

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) {
      setUsers([]);
      setCurrentUserId(null);
      setRoleDrafts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = await fetchJson<{ users: ManagedUser[]; currentUserId: number }>("/api/admin/users");
      const nextUsers = Array.isArray(payload.users) ? payload.users : [];
      setUsers(nextUsers);
      setCurrentUserId(typeof payload.currentUserId === "number" ? payload.currentUserId : null);
      setRoleDrafts(
        Object.fromEntries(nextUsers.map((managedUser) => [managedUser.id, managedUser.role])) as Record<
          number,
          AuthRole
        >,
      );
    } catch (error) {
      setUsers([]);
      setCurrentUserId(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const groupedUsers = useMemo(
    () => ({
      pending: users.filter((managedUser) => managedUser.approvalStatus === "pending"),
      approved: users.filter((managedUser) => managedUser.approvalStatus === "approved"),
      rejected: users.filter((managedUser) => managedUser.approvalStatus === "rejected"),
    }),
    [users],
  );

  const handleApproval = async (targetUserId: number, approvalStatus: ApprovalStatus) => {
    setBusyAction(`approval:${targetUserId}:${approvalStatus}`);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await fetchJson<{ user: ManagedUser }>(`/api/admin/users/${targetUserId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus }),
      });
      setStatusMessage(
        approvalStatus === "approved"
          ? "User approved successfully."
          : "User status updated successfully.",
      );
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update approval");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRoleUpdate = async (targetUserId: number) => {
    const nextRole = roleDrafts[targetUserId];
    if (!nextRole) return;

    setBusyAction(`role:${targetUserId}`);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await fetchJson<{ user: ManagedUser }>(`/api/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      setStatusMessage("Role updated successfully.");
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteUser = async (managedUser: ManagedUser) => {
    const confirmed = window.confirm(
      `Delete ${managedUser.displayName || managedUser.email} (${managedUser.email})?\n\nThis permanently removes the account if it has no dataset records.`,
    );
    if (!confirmed) return;

    setBusyAction(`delete:${managedUser.id}`);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await fetchJson<{ ok: boolean; deletedUserId: number }>(`/api/admin/users/${managedUser.id}`, {
        method: "DELETE",
      });
      setStatusMessage("User deleted successfully.");
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete user");
    } finally {
      setBusyAction(null);
    }
  };

  const renderUserCard = (managedUser: ManagedUser) => {
    const analystCannotManageAdmin = user?.role === "analyst" && managedUser.role === "admin";
    const canApproveReject = !analystCannotManageAdmin;
    const canEditRole = user?.role === "admin";
    const canDeleteUser = !analystCannotManageAdmin && managedUser.id !== currentUserId;
    const currentRoleDraft = roleDrafts[managedUser.id] ?? managedUser.role;

    return (
      <article
        key={managedUser.id}
        className="rounded-sm border border-border bg-card p-5 shadow-xl shadow-black/10"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-sans-tech text-xl font-bold text-foreground">
                {managedUser.displayName}
              </h3>
              <RoleBadge role={managedUser.role} />
              <ApprovalBadge status={managedUser.approvalStatus} />
            </div>

            <div className="mt-2 font-mono-tech text-xs text-primary">{managedUser.email}</div>

            <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  User ID
                </div>
                <div className="mt-1 text-foreground">{managedUser.id}</div>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Storage Slug
                </div>
                <div className="mt-1 break-all text-foreground">{managedUser.storageSlug}</div>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Created
                </div>
                <div className="mt-1 text-foreground">{formatTimestamp(managedUser.createdAt)}</div>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Last Login
                </div>
                <div className="mt-1 text-foreground">{formatTimestamp(managedUser.lastLoginAt)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-sm border border-border bg-background/60 px-4 py-3 text-sm">
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Approved By
              </span>
              <div className="mt-1 text-foreground">
                {managedUser.approvedByEmail
                  ? `${managedUser.approvedByDisplayName || managedUser.approvedByEmail} (${managedUser.approvedByEmail})`
                  : "Not yet approved"}
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-sm border border-border bg-background/60 p-4 lg:w-[320px]">
            <div className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Account actions
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="font-mono-tech text-xs"
                disabled={!canApproveReject || managedUser.approvalStatus === "approved" || busyAction !== null}
                onClick={() => void handleApproval(managedUser.id, "approved")}
              >
                {busyAction === `approval:${managedUser.id}:approved` && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-mono-tech text-xs"
                disabled={!canApproveReject || managedUser.approvalStatus === "rejected" || busyAction !== null}
                onClick={() => void handleApproval(managedUser.id, "rejected")}
              >
                {busyAction === `approval:${managedUser.id}:rejected` && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Reject
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="font-mono-tech text-xs"
                disabled={!canDeleteUser || busyAction !== null}
                onClick={() => void handleDeleteUser(managedUser)}
              >
                {busyAction === `delete:${managedUser.id}` ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Delete is only available when the account has no dataset records.
            </p>

            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2 font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Role
              </div>
              <div className="flex gap-2">
                <select
                  value={currentRoleDraft}
                  onChange={(event) =>
                    setRoleDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [managedUser.id]: event.target.value as AuthRole,
                    }))
                  }
                  disabled={!canEditRole || busyAction !== null}
                  className="h-10 flex-1 rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  {ROLE_OPTIONS.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono-tech text-xs"
                  disabled={!canEditRole || currentRoleDraft === managedUser.role || busyAction !== null}
                  onClick={() => void handleRoleUpdate(managedUser.id)}
                >
                  {busyAction === `role:${managedUser.id}` && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Update
                </Button>
              </div>
              {!canEditRole && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Analysts can review approvals but only admins can change roles.
                </p>
              )}
              {managedUser.id === currentUserId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  You cannot delete your own account from this page.
                </p>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
        <Navigation />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading account access...
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !isApproved) {
    return (
      <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
        <Navigation />
        <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <AuthRequiredState description="User access management only opens for approved analyst or admin accounts." />
          </div>
        </main>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
        <Navigation />
        <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6">
          <div className="mx-auto max-w-[1440px] rounded-sm border border-border bg-card p-8 shadow-2xl shadow-black/10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-mono-tech text-xs uppercase tracking-[0.22em] text-primary">
              Restricted
            </div>
            <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground">
              User access controls are limited to elevated roles
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Customer accounts can use public and private datasets, but analyst or admin access is
              required to approve registrations and manage roles.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
      <Navigation />

      <main className="relative z-10 px-4 pb-10 pt-24 sm:px-6">
        <div className="mx-auto max-w-[1440px] space-y-8">
          <header className="rounded-sm border border-border bg-card p-8 shadow-2xl shadow-black/10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-mono-tech text-xs uppercase tracking-[0.22em] text-primary">
              Datara Access Control
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Approve registrations and manage elevated access
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                  This page is the supported approval workflow for Datara-managed accounts. Analysts
                  can approve, reject, or delete users, while admins can also change account roles.
                </p>
              </div>
              <Button variant="outline" className="font-mono-tech text-xs" onClick={() => void loadUsers()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Pending" value={groupedUsers.pending.length} icon={<Clock3 className="h-5 w-5" />} />
            <SummaryCard
              label="Approved"
              value={groupedUsers.approved.length}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <SummaryCard
              label="Rejected"
              value={groupedUsers.rejected.length}
              icon={<XCircle className="h-5 w-5" />}
            />
          </section>

          {statusMessage && (
            <div className="rounded-sm border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {statusMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-sm border border-border bg-card text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading users...
            </div>
          ) : (
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <h2 className="font-sans-tech text-2xl font-bold text-foreground">Pending users</h2>
                </div>
                {groupedUsers.pending.length > 0 ? (
                  <div className="space-y-4">{groupedUsers.pending.map(renderUserCard)}</div>
                ) : (
                  <div className="rounded-sm border border-dashed border-border bg-card/10 px-6 py-8 text-sm text-muted-foreground">
                    No pending accounts right now.
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-sans-tech text-2xl font-bold text-foreground">Approved users</h2>
                </div>
                {groupedUsers.approved.length > 0 ? (
                  <div className="space-y-4">{groupedUsers.approved.map(renderUserCard)}</div>
                ) : (
                  <div className="rounded-sm border border-dashed border-border bg-card/10 px-6 py-8 text-sm text-muted-foreground">
                    No approved accounts are available yet.
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserCog className="h-5 w-5 text-primary" />
                  <h2 className="font-sans-tech text-2xl font-bold text-foreground">Rejected users</h2>
                </div>
                {groupedUsers.rejected.length > 0 ? (
                  <div className="space-y-4">{groupedUsers.rejected.map(renderUserCard)}</div>
                ) : (
                  <div className="rounded-sm border border-dashed border-border bg-card/10 px-6 py-8 text-sm text-muted-foreground">
                    No rejected accounts are recorded.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
