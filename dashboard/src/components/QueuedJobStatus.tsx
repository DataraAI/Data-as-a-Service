import { CheckCircle2, Clock3, ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import { formatJobEta, type LambdaJob } from "@/lib/lambdaJobs";

interface QueuedJobStatusProps {
  job?: LambdaJob | null;
  jobs?: LambdaJob[];
  onOpenViewerPath?: (viewerPath: string) => void;
  onClear?: (jobId: string) => void;
}

export function QueuedJobStatus({ job, jobs, onOpenViewerPath, onClear }: QueuedJobStatusProps) {
  const visibleJobs = (jobs ?? (job ? [job] : [])).slice(-1);
  if (visibleJobs.length === 0) return null;

  return <div>{visibleJobs.map((visibleJob) => (
    <QueuedJobCard
      key={visibleJob.job_id}
      job={visibleJob}
      onOpenViewerPath={onOpenViewerPath}
      onClear={onClear}
    />
  ))}</div>;
}

function QueuedJobCard({
  job,
  onOpenViewerPath,
  onClear,
}: {
  job: LambdaJob;
  onOpenViewerPath?: (viewerPath: string) => void;
  onClear?: (jobId: string) => void;
}) {
  const isActive = job.status === "queued" || job.status === "running";
  const viewerPath = job.result?.viewer_path;
  const proxyUrl = job.result?.proxy_url;

  return (
    <div className="mt-3 rounded-sm border border-primary/20 bg-primary/5 p-3 text-[11px]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans-tech font-bold text-foreground">Ticket #{job.ticket_number}</span>
        <span className="inline-flex items-center gap-1 font-sans-tech font-semibold text-primary">
          {isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {job.status === "succeeded" ? <CheckCircle2 className="h-3 w-3" /> : null}
          {job.status === "failed" ? <TriangleAlert className="h-3 w-3" /> : null}
          {job.stage}
        </span>
      </div>

      <p className="mt-2 leading-relaxed text-muted-foreground">{job.user_message}</p>

      {isActive && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-border bg-background/60 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Queue position</div>
            <div className="mt-0.5 font-mono-tech text-foreground">{job.queue_position ?? "Updating"}</div>
          </div>
          <div className="rounded-sm border border-border bg-background/60 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              <Clock3 className="h-2.5 w-2.5" />
              Estimated time
            </div>
            <div className="mt-0.5 font-mono-tech text-foreground">{formatJobEta(job.eta_seconds)}</div>
          </div>
        </div>
      )}

      {job.status === "failed" && <p className="mt-2 text-destructive">{job.error}</p>}

      {(viewerPath || proxyUrl) && (
        <button
          type="button"
          onClick={() => {
            if (viewerPath && onOpenViewerPath) onOpenViewerPath(viewerPath);
            if (proxyUrl) window.open(proxyUrl, "_blank", "noopener,noreferrer");
          }}
          className="mt-2 inline-flex items-center gap-1 rounded-sm border border-primary/25 bg-background px-2 py-1.5 font-semibold text-primary"
        >
          Open result
          <ExternalLink className="h-3 w-3" />
        </button>
      )}

      {!isActive && onClear && (
        <button type="button" onClick={() => onClear(job.job_id)} className="mt-2 block text-muted-foreground hover:text-foreground">
          Dismiss status
        </button>
      )}
    </div>
  );
}
