import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  Upload,
  X,
  Loader2,
  Plus,
  Link as LinkIcon,
  Folder,
  FileVideo,
  Cloud,
  HardDrive,
  LockKeyhole,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { canImportData } from "@/lib/dataImportAccess";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadSource = "gdrive" | "local";
type UploadType = "video" | "folder";
type ViewMode = "exo" | "egos";

const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|tiff?)$/i;
const CATEGORY_OPTIONS = ["carAutomation", "serverrack", "dexterity", "warehouse"];

function isDirectFileInSelectedFolder(file: File): boolean {
  const relativePath = (file.webkitRelativePath?.trim() || file.name).replace(/\\/g, "/");
  const parts = relativePath.split("/").filter((part) => part.length > 0);
  return parts.length <= 2;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { isAuthenticated, isApproved, login, user } = useAuth();
  const [source, setSource] = useState<UploadSource>("gdrive");
  const [gdriveLink, setGdriveLink] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0]);
  const [datasetName, setDatasetName] = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("video");
  const [viewMode, setViewMode] = useState<ViewMode>("exo");
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [task, setTask] = useState("");
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const [localFolderFiles, setLocalFolderFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const clearLocalFiles = () => {
    setLocalVideoFile(null);
    setLocalFolderFiles([]);
    setFileInputKey((value) => value + 1);
  };

  const handleSourceChange = (next: UploadSource) => {
    setSource(next);
    setGdriveLink("");
    clearLocalFiles();
  };

  const handleUploadTypeChange = (next: UploadType) => {
    setUploadType(next);
    clearLocalFiles();
  };

  if (!isOpen) return null;

  const canImport = canImportData({ isAuthenticated, isApproved, user });

  if (!canImport) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-background/80 px-4 pb-6 pt-24 backdrop-blur-md sm:px-6 sm:pt-28">
        <div className="relative mx-auto w-full max-w-lg rounded-lg border border-border bg-card p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <LockKeyhole className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-sans-tech text-2xl font-bold text-foreground">
            Import access required
          </h2>
          <p className="mt-3 font-sans-tech text-sm leading-relaxed text-muted-foreground">
            Dataset import is available to approved accounts with import access. You can still
            browse, view, and download approved public datasets.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => login()}
                className="rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const topLevelImageFiles = localFolderFiles.filter(
    (file) => isDirectFileInSelectedFolder(file) && IMAGE_EXT.test(file.name),
  );
  const nestedFileCount = localFolderFiles.filter((file) => !isDirectFileInSelectedFolder(file)).length;

  const handleAddTag = () => {
    const nextTag = currentTag.trim();
    if (!nextTag) return;
    if (!tags.includes(nextTag)) setTags((prev) => [...prev, nextTag]);
    setCurrentTag("");
  };

  const handleRemoveTag = (index: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetFormAfterSuccess = () => {
    setGdriveLink("");
    setDatasetName("");
    setTags([]);
    setCurrentTag("");
    setTask("");
    setUploadType("video");
    setSource("gdrive");
    setViewMode("exo");
    clearLocalFiles();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedCategory || !datasetName.trim()) return;
    if (source === "gdrive" && !gdriveLink.trim()) return;
    if (source === "local" && uploadType === "video" && !localVideoFile) {
      alert("Please choose a video file from your computer.");
      return;
    }
    if (source === "local" && uploadType === "folder") {
      if (localFolderFiles.length === 0) {
        alert("Please choose a folder that contains images.");
        return;
      }
      if (topLevelImageFiles.length === 0) {
        alert("No supported images found in the selected folder root.");
        return;
      }
    }

    setIsUploading(true);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    try {
      if (source === "gdrive") {
        const response = await fetch("/api/process_video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gdrive_link: gdriveLink.trim(),
            category: selectedCategory.trim(),
            dataset_name: datasetName.trim(),
            upload_type: uploadType,
            date,
            tags,
            task: task.trim(),
            view: viewMode,
            visibility: "public",
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Upload failed");
      } else {
        const formData = new FormData();
        formData.append("upload_type", uploadType);
        formData.append("category", selectedCategory.trim());
        formData.append("dataset_name", datasetName.trim());
        formData.append("date", date);
        formData.append("tags", JSON.stringify(tags));
        formData.append("task", task.trim());
        formData.append("view", viewMode);
        formData.append("visibility", "public");
        if (uploadType === "video" && localVideoFile) {
          formData.append("file", localVideoFile);
        } else {
          topLevelImageFiles.forEach((file) => formData.append("files", file));
        }

        const response = await fetch("/api/process_video", { method: "POST", body: formData });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Upload failed");
      }

      alert("Success: Data uploaded and processed!");
      onSuccess?.();
      onClose();
      resetFormAfterSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      alert(`Error: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-background/80 px-4 pb-6 pt-24 backdrop-blur-md sm:px-6 sm:pt-28">
      <div className="relative mx-auto w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-8 shadow-2xl">
        <div className="absolute left-0 right-0 top-0 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-6">
          <h2 className="flex items-center gap-2 font-sans-tech text-xl font-bold text-foreground">
            <div className="rounded-sm bg-primary/10 p-2">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Import Data
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Import public RoboDataHub data into the vertical/task layout.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-sm border border-border bg-input p-1">
            <div className="flex">
              <button
                type="button"
                onClick={() => handleSourceChange("gdrive")}
                className={`flex-1 rounded-sm py-2 text-sm font-medium ${source === "gdrive" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Google Drive
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange("local")}
                className={`flex-1 rounded-sm py-2 text-sm font-medium ${source === "local" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  This computer
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-input p-1">
            <div className="flex">
              <button
                type="button"
                onClick={() => handleUploadTypeChange("video")}
                className={`flex-1 rounded-sm py-2 text-sm font-medium ${uploadType === "video" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  Video File
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleUploadTypeChange("folder")}
                className={`flex-1 rounded-sm py-2 text-sm font-medium ${uploadType === "folder" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Image Folder
                </span>
              </button>
            </div>
          </div>

          {source === "gdrive" ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">
                {uploadType === "video" ? "Drive link (video)" : "Drive link (folder)"}
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={gdriveLink}
                  onChange={(event) => setGdriveLink(event.target.value)}
                  placeholder={
                    uploadType === "video"
                      ? "https://drive.google.com/file/d/..."
                      : "https://drive.google.com/drive/folders/..."
                  }
                  className="w-full rounded-sm border border-border bg-input px-3 py-2 pl-9 text-sm text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>
          ) : uploadType === "video" ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Video file</label>
              <input
                key={`local-video-${fileInputKey}`}
                type="file"
                accept="video/*"
                onChange={(event) => setLocalVideoFile(event.target.files?.[0] ?? null)}
                className="w-full text-sm text-foreground file:mr-3 file:rounded-sm file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Image folder</label>
              <input
                key={`local-folder-${fileInputKey}`}
                type="file"
                multiple
                {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)}
                onChange={(event) => setLocalFolderFiles(Array.from(event.target.files ?? []))}
                className="w-full text-sm text-foreground file:mr-3 file:rounded-sm file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
              />
              {localFolderFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {topLevelImageFiles.length} image{topLevelImageFiles.length === 1 ? "" : "s"} in
                  folder root
                  {nestedFileCount > 0 ? ` (${nestedFileCount} nested files ignored)` : ""}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Vertical</label>
            <input
              list="dataset-category-options"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
            <datalist id="dataset-category-options">
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Task Slug</label>
            <input
              type="text"
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
              placeholder="e.g. frontGrille or Front Grille"
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
            <p className="text-[11px] leading-5 text-muted-foreground">
              This becomes the dataset path: vertical/taskSlug. Spaces are normalized by the server.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Task Label</label>
            <input
              type="text"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Optional display label, e.g. Front grille inspection"
              className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">View Type</label>
            <div className="flex gap-4 rounded-sm border border-border bg-input px-3 py-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={viewMode === "exo"} onChange={() => setViewMode("exo")} />
                Exocentric
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={viewMode === "egos"} onChange={() => setViewMode("egos")} />
                Egocentric
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Metadata Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={currentTag}
                onChange={(event) => setCurrentTag(event.target.value)}
                placeholder="Add tag..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 rounded-sm border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-sm border border-border bg-input px-3 py-2 text-primary transition-colors hover:border-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={`${tag}-${index}`}
                    className="flex items-center gap-1 rounded-sm border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary"
                  >
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isUploading && <Loader2 className="h-3 w-3 animate-spin" />}
              {isUploading ? "Processing..." : "Start Process"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
