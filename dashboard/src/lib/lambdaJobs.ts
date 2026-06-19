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

export function useQueuedJob(storageKey: string, onComplete?: (job: LambdaJob) => void) {
  const [jobs, setJobs] = useState<LambdaJob[]>([]);
  const onCompleteRef = useRef(onComplete);
  const completedJobIdsRef = useRef(new Set<string>());
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      setJobs([]);
      return;
    }

    let storedJobIds: string[];
    try {
      const parsed = JSON.parse(stored);
      storedJobIds = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [stored];
    } catch {
      storedJobIds = [stored];
    }
    let cancelled = false;
    Promise.all(
      storedJobIds.map(async (jobId) => {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { credentials: "include" });
        if (!response.ok) return null;
        return (await response.json()) as LambdaJob;
      }),
    )
      .then((loadedJobs) => {
        if (!cancelled) setJobs(loadedJobs.filter((job): job is LambdaJob => job !== null));
      })
      .catch(() => {
        // Keep stored IDs so a temporary connectivity issue does not lose tickets.
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "running");
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
          setJobs((current) => current.map((job) => byId.get(job.job_id) ?? job));
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
  }, [jobs.map((job) => `${job.job_id}:${job.status}`).join("|")]);

  useEffect(() => {
    for (const job of jobs) {
      if (job.status !== "succeeded" && job.status !== "failed") continue;
      if (completedJobIdsRef.current.has(job.job_id)) continue;
      completedJobIdsRef.current.add(job.job_id);
      onCompleteRef.current?.(job);
    }
  }, [jobs]);

  const trackJob = (nextJob: LambdaJob) => {
    completedJobIdsRef.current.delete(nextJob.job_id);
    setJobs((current) => {
      const next = [...current.filter((job) => job.job_id !== nextJob.job_id), nextJob];
      window.localStorage.setItem(storageKey, JSON.stringify(next.map((job) => job.job_id)));
      return next;
    });
  };

  const clearJob = (jobId?: string) => {
    setJobs((current) => {
      const next = jobId ? current.filter((job) => job.job_id !== jobId) : [];
      if (next.length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(next.map((job) => job.job_id)));
      } else {
        window.localStorage.removeItem(storageKey);
      }
      return next;
    });
  };

  return {
    job: jobs.at(-1) ?? null,
    jobs,
    trackJob,
    clearJob,
    isActive: jobs.some((job) => job.status === "queued" || job.status === "running"),
  };
}
