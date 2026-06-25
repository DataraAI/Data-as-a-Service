import { useEffect, useRef, useState } from "react";

export interface LambdaJobOwner {
  display_name: string;
  email: string;
}

export interface LambdaJobResult {
  viewer_path?: string;
  proxy_url?: string;
  tasks?: unknown[];
}

export interface LambdaJob {
  job_id: string;
  ticket_number: number;
  job_type: string;
  job_label: string;
  status: "queued" | "running" | "succeeded" | "failed";
  stage: "Queued" | "Preparing" | "Processing" | "Finalizing" | "Complete" | "Failed";
  queue_position: number | null;
  eta_seconds: number | null;
  estimated_wait_seconds?: number | null;
  submitted_at: string;
  completed_at: string | null;
  user_message: string;
  result: LambdaJobResult | null;
  error: string | null;
  owner?: LambdaJobOwner;
}

export async function submitGenerationRequest(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<LambdaJob> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 && typeof data.job_id === "string") {
    return data as LambdaJob;
  }
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "The request could not be submitted.",
    );
  }
  return data as LambdaJob;
}

export function formatJobEta(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "Calculating";
  if (seconds < 60) return "Less than a minute";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `About ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `About ${hours} hr ${remainingMinutes} min` : `About ${hours} hr`;
}

const INLINE_GENERATION_JOB_STARTED_EVENT = "datara:inline-generation-job-started";

function isActiveJob(job: LambdaJob) {
  return job.status === "queued" || job.status === "running";
}

function getStartedJobId(event: Event) {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail as { jobId?: unknown } | null;
  return typeof detail?.jobId === "string" ? detail.jobId : null;
}

export function useQueuedJob(storageKey: string, onComplete?: (job: LambdaJob) => void) {
  const [trackedJobs, setTrackedJobs] = useState<LambdaJob[]>([]);
  const [visibleJobId, setVisibleJobId] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completedJobIdsRef = useRef(new Set<string>());
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setTrackedJobs([]);
    setVisibleJobId(null);
    completedJobIdsRef.current.clear();
  }, [storageKey]);

  useEffect(() => {
    const clearOlderInlineJobs = (event: Event) => {
      const startedJobId = getStartedJobId(event);
      setVisibleJobId((current) => (current === startedJobId ? current : null));
    };

    window.addEventListener(INLINE_GENERATION_JOB_STARTED_EVENT, clearOlderInlineJobs);
    return () => {
      window.removeEventListener(INLINE_GENERATION_JOB_STARTED_EVENT, clearOlderInlineJobs);
    };
  }, []);

  useEffect(() => {
    const activeJobs = trackedJobs.filter(isActiveJob);
    if (activeJobs.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const updates = await Promise.all(
          activeJobs.map(async (job) => {
            const response = await fetch(`/api/jobs/${encodeURIComponent(job.job_id)}`, { credentials: "include" });
            if (!response.ok) return job;
            return (await response.json()) as LambdaJob;
          }),
        );
        if (!cancelled) {
          const byId = new Map(updates.map((job) => [job.job_id, job]));
          setTrackedJobs((current) => current.map((job) => byId.get(job.job_id) ?? job));
        }
      } catch {
        // Keep the last known safe status while connectivity recovers.
      }
    };

    const timer = window.setInterval(() => void poll(), 3000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [trackedJobs.map((job) => `${job.job_id}:${job.status}`).join("|")]);

  useEffect(() => {
    for (const job of trackedJobs) {
      if (job.status !== "succeeded" && job.status !== "failed") continue;
      if (completedJobIdsRef.current.has(job.job_id)) continue;
      completedJobIdsRef.current.add(job.job_id);
      onCompleteRef.current?.(job);
    }
  }, [trackedJobs]);

  const trackJob = (nextJob: LambdaJob) => {
    completedJobIdsRef.current.delete(nextJob.job_id);
    window.dispatchEvent(new CustomEvent(INLINE_GENERATION_JOB_STARTED_EVENT, { detail: { jobId: nextJob.job_id } }));
    setTrackedJobs((current) => [...current.filter((job) => job.job_id !== nextJob.job_id && isActiveJob(job)), nextJob]);
    setVisibleJobId(nextJob.job_id);
  };

  const clearJob = (jobId?: string) => {
    setVisibleJobId((current) => (!jobId || current === jobId ? null : current));
    setTrackedJobs((current) => {
      return jobId ? current.filter((job) => job.job_id !== jobId || isActiveJob(job)) : current.filter(isActiveJob);
    });
  };

  const visibleJobs = visibleJobId ? trackedJobs.filter((job) => job.job_id === visibleJobId) : [];

  return {
    job: visibleJobs.at(-1) ?? null,
    jobs: visibleJobs,
    trackJob,
    clearJob,
    isActive: trackedJobs.some(isActiveJob),
  };
}
