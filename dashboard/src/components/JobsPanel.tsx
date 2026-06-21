import { BriefcaseBusiness, Clock3, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatJobEta, type LambdaJob } from "@/lib/lambdaJobs";

interface JobsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewHistory: boolean;
}

type JobsPayload = {
  jobs?: LambdaJob[];
  active?: LambdaJob[];
  recent?: LambdaJob[];
};

export function JobsPanel({ open, onOpenChange, canViewHistory }: JobsPanelProps) {
  const [activeJobs, setActiveJobs] = useState<LambdaJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<LambdaJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const queuedJobs = useMemo(
    () => activeJobs.filter((job) => job.status === "queued"),
    [activeJobs],
  );
  const runningJobs = useMemo(
    () => activeJobs.filter((job) => job.status === "running"),
    [activeJobs],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(canViewHistory ? "/api/jobs" : "/api/jobs/active", {
          credentials: "include",
        });
        if (!response.ok) return;
        const data = (await response.json()) as JobsPayload;
        if (cancelled) return;

        const active = canViewHistory ? data.active : data.jobs;
        setActiveJobs(Array.isArray(active) ? active : []);
        setRecentJobs(canViewHistory && Array.isArray(data.recent) ? data.recent : []);
        setLastUpdated(new Date());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [canViewHistory, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100vw,420px)] flex-col gap-0 overflow-hidden border-slate-200 bg-card p-0 text-slate-950 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-slate-200 px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <SheetTitle className="text-base font-extrabold text-slate-950">Jobs</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-slate-500">
                Current queued and running requests
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Updating"}</span>
          <span className="inline-flex items-center gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Auto refresh
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <JobSection title="Queued" jobs={queuedJobs} emptyText="No queued jobs." showOwner={canViewHistory} />
          <JobSection title="Running" jobs={runningJobs} emptyText="No running jobs." showOwner={canViewHistory} />

          {canViewHistory && recentJobs.length > 0 && (
            <JobSection title="Recent" jobs={recentJobs} emptyText="" showOwner={canViewHistory} muted />
          )}

          {!loading && activeJobs.length === 0 && (!canViewHistory || recentJobs.length === 0) && (
            <div className="rounded-sm border border-slate-200 bg-muted/60 px-4 py-8 text-center text-sm text-slate-500">
              No jobs to show.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JobSection({
  title,
  jobs,
  emptyText,
  showOwner,
  muted = false,
}: {
  title: string;
  jobs: LambdaJob[];
  emptyText: string;
  showOwner: boolean;
  muted?: boolean;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {jobs.length}
        </span>
      </div>
      {jobs.length === 0 && emptyText ? (
        <div className="rounded-sm border border-slate-200 bg-card px-3 py-3 text-xs text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} showOwner={showOwner} muted={muted} />
          ))}
        </div>
      )}
    </section>
  );
}

function JobCard({ job, showOwner, muted }: { job: LambdaJob; showOwner: boolean; muted: boolean }) {
  const isActive = job.status === "queued" || job.status === "running";
  const ownerName = job.owner?.display_name || job.owner?.email;

  return (
    <article className={`rounded-sm border p-3 ${muted ? "border-slate-200 bg-muted/60" : "border-primary/20 bg-primary/5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-950">
            Ticket #{job.ticket_number}
          </div>
          <div className="mt-0.5 truncate text-xs font-semibold text-slate-600">{job.job_label}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${job.status === "failed" ? "bg-red-50 text-red-700" : job.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}>
          {job.stage}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-sm bg-card px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Position</div>
          <div className="mt-0.5 font-bold text-slate-700">{isActive ? job.queue_position ?? "Updating" : "-"}</div>
        </div>
        <div className="rounded-sm bg-card px-2 py-1.5">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-slate-400">
            <Clock3 className="h-2.5 w-2.5" />
            Time
          </div>
          <div className="mt-0.5 font-bold text-slate-700">{isActive ? formatJobEta(job.eta_seconds) : "-"}</div>
        </div>
      </div>

      {showOwner && ownerName && (
        <div className="mt-2 truncate text-[11px] text-slate-500">Submitted by {ownerName}</div>
      )}
      {job.status === "failed" && job.error && (
        <div className="mt-2 text-[11px] text-red-700">{job.error}</div>
      )}
    </article>
  );
}
