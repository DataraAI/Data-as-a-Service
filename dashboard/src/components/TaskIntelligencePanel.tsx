import { Clock, Loader2, Workflow } from "lucide-react";
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

function TaskIntelligenceResults({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <div key={index} className="overflow-hidden rounded-sm border border-border bg-card/30">
          <div className="border-b border-border bg-background/50 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-sans-tech text-sm font-bold text-foreground">{task.task_name}</h3>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono-tech text-[10px] text-primary">
                <Clock className="h-3 w-3" />
                {task.start_time} - {task.end_time}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
          </div>

          <div className="divide-y divide-border bg-background/20 p-2">
            <div className="mb-2 px-2 pt-1 font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Subtasks
            </div>
            {task.subtasks.map((subtask, subIndex) => (
              <div
                key={subIndex}
                title="Click-to-jump coming soon"
                className="group cursor-pointer rounded-sm p-2 transition-colors hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-sans-tech text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                    {subtask.subtask_name}
                  </span>
                  <span className="shrink-0 font-mono-tech text-[10px] text-muted-foreground">
                    {subtask.start_time} - {subtask.end_time}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{subtask.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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

      {!loading && tasks && <TaskIntelligenceResults tasks={tasks} />}
    </div>
  );
}
