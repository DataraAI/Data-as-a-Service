import { Loader2, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { QueuedJobStatus } from "./QueuedJobStatus";
import { submitGenerationRequest, useQueuedJob } from "@/lib/lambdaJobs";

export interface Subtask {
  subtask_name: string;
  start_time: string;
  end_time: string;
  description: string;
}

export interface Task {
  task_name: string;
  description: string;
  start_time: string;
  end_time: string;
  subtasks: Subtask[];
}

export function getTaskIntelligenceFromMetadata(metadata: unknown): Task[] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const tasks = (metadata as { taskIntelligence?: { tasks?: Task[] } }).taskIntelligence?.tasks;
  return Array.isArray(tasks) && tasks.length > 0 ? tasks : null;
}

interface TaskIntelligencePanelProps {
  assetId?: string;
  videoID: string;
  videoURL?: string;
  datasetName?: string;
  initialTasks?: Task[] | null;
  onGenerated?: () => void;
}

export default function TaskIntelligencePanel({
  assetId,
  videoID,
  videoURL = "",
  datasetName = "default_dataset",
  initialTasks = null,
  onGenerated,
}: TaskIntelligencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[] | null>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const queuedJob = useQueuedJob(`datara-job:task-analysis:${assetId || videoID}`, (completedJob) => {
    if (completedJob.status === "succeeded" && Array.isArray(completedJob.result?.tasks)) {
      setTasks(completedJob.result.tasks as Task[]);
      onGenerated?.();
    }
  });

  useEffect(() => {
    setTasks(initialTasks);
    setError(null);
  }, [videoID, initialTasks]);

  const generateIntelligence = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitGenerationRequest("/api/generate_task_intelligence", {
          asset_id: assetId || videoID,
          videoID,
          videoURL,
          datasetName,
      });
      queuedJob.trackJob(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="mb-3 flex items-center gap-2 font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Workflow className="h-4 w-4" />
        Task Intelligence
      </label>

      {!loading && (
        <div className={`flex flex-col gap-3 ${tasks ? "mb-4" : ""}`}>
          {!tasks && (
            <p className="font-sans-tech text-[11px] leading-relaxed text-muted-foreground">
              Automatically analyze this video to extract sequential tasks and subtasks.
            </p>
          )}
          <button
            type="button"
            onClick={generateIntelligence}
            disabled={loading || queuedJob.isActive}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
          >
            {queuedJob.isActive ? "Request in progress" : tasks ? "Regenerate Task Intelligence" : "Generate Task Intelligence"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex h-24 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card/30">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-sans-tech text-xs text-muted-foreground">Analyzing video frames...</span>
        </div>
      )}

      <QueuedJobStatus jobs={queuedJob.jobs} onClear={queuedJob.clearJob} />
    </div>
  );
}
