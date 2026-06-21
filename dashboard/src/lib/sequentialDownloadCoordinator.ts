export type SequentialDownloadItem = {
  url?: string;
  filename: string;
};

export type SequentialDownloadState = {
  status: "idle" | "running";
  current: number;
  total: number;
  started: number;
  skipped: number;
};

export type SequentialDownloadSummary = {
  total: number;
  started: number;
  skipped: number;
};

type SequentialDownloadDependencies = {
  checkAvailability: (item: SequentialDownloadItem) => Promise<boolean>;
  triggerDownload: (item: SequentialDownloadItem) => void;
  waitBetweenDownloads: () => Promise<void>;
};

const IDLE_STATE: SequentialDownloadState = {
  status: "idle",
  current: 0,
  total: 0,
  started: 0,
  skipped: 0,
};

export function createSequentialDownloadCoordinator() {
  let state = IDLE_STATE;
  let activeRun: Promise<SequentialDownloadSummary> | null = null;
  const listeners = new Set<() => void>();

  const emit = (nextState: SequentialDownloadState) => {
    state = nextState;
    listeners.forEach((listener) => listener());
  };

  const run = async (
    items: SequentialDownloadItem[],
    dependencies: SequentialDownloadDependencies,
  ): Promise<SequentialDownloadSummary> => {
    const total = items.length;
    let started = 0;
    let skipped = 0;

    emit({ status: "running", current: 0, total, started, skipped });

    try {
      for (const [index, item] of items.entries()) {
        const current = index + 1;

        try {
          const available = Boolean(item.url) && (await dependencies.checkAvailability(item));
          if (!available) {
            skipped += 1;
          } else {
            dependencies.triggerDownload(item);
            started += 1;
          }
        } catch {
          skipped += 1;
        }

        emit({ status: "running", current, total, started, skipped });

        if (current < total) {
          await dependencies.waitBetweenDownloads();
        }
      }

      return { total, started, skipped };
    } finally {
      emit(IDLE_STATE);
    }
  };

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    start: (
      items: SequentialDownloadItem[],
      dependencies: SequentialDownloadDependencies,
    ): Promise<SequentialDownloadSummary> => {
      if (activeRun) {
        return activeRun;
      }

      activeRun = run(items, dependencies).finally(() => {
        activeRun = null;
      });
      return activeRun;
    },
  };
}

export const trainingDataDownloadCoordinator = createSequentialDownloadCoordinator();
