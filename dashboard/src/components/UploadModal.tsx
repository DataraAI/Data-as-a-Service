import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Upload, X, Loader2, Plus, Link as LinkIcon, Folder, FileVideo, Cloud, HardDrive } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|tiff?)$/i;

/** Files directly in the chosen folder (not in subfolders). webkitRelativePath includes the root folder as the first segment. */
function isDirectFileInSelectedFolder(file: File): boolean {
    const rel = (file.webkitRelativePath?.trim() || file.name).replace(/\\/g, "/");
    const parts = rel.split("/").filter((p) => p.length > 0);
    return parts.length <= 2;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [source, setSource] = useState<'gdrive' | 'local'>('gdrive');
    const [gdriveLink, setGdriveLink] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [brandName, setBrandName] = useState("");
    const [datasetName, setDatasetName] = useState("");
    const [uploadType, setUploadType] = useState<'video' | 'folder'>('video');
    const [isUploading, setIsUploading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");
    const [task, setTask] = useState("");
    const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
    const [localFolderFiles, setLocalFolderFiles] = useState<File[]>([]);
    const [fileInputKey, setFileInputKey] = useState(0);

    useEffect(() => {
        fetch('/api/datasets?path=')
            .then(res => res.json())
            .then(data => {
                const cats = data.filter((d: any) => d.type === 'folder').map((d: any) => d.name);
                if (cats.length > 0) setSelectedCategory(cats[0]);
            })
            .catch(err => console.error("Failed to fetch categories", err));
    }, []);

    const clearLocalFiles = () => {
        setLocalVideoFile(null);
        setLocalFolderFiles([]);
        setFileInputKey((k) => k + 1);
    };

    const handleSourceChange = (next: 'gdrive' | 'local') => {
        setSource(next);
        setGdriveLink("");
        clearLocalFiles();
    };

    const handleUploadTypeChange = (next: 'video' | 'folder') => {
        setUploadType(next);
        clearLocalFiles();
    };

    if (!isOpen) return null;

    const topLevelImageFiles = localFolderFiles.filter(
        (f) => isDirectFileInSelectedFolder(f) && IMAGE_EXT.test(f.name),
    );
    const nestedFileCount = localFolderFiles.filter((f) => !isDirectFileInSelectedFolder(f)).length;

    const handleAddTag = () => {
        const nextTag = currentTag.trim();
        if (!nextTag) return;
        if (tags.includes(nextTag)) {
            setCurrentTag("");
            return;
        }
        setTags([...tags, nextTag]);
        setCurrentTag("");
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const resetFormAfterSuccess = () => {
        setGdriveLink("");
        setBrandName("");
        setDatasetName("");
        setTags([]);
        setCurrentTag("");
        setTask("");
        setUploadType('video');
        setSource('gdrive');
        clearLocalFiles();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedCategory || !brandName || !datasetName) return;

        if (source === 'gdrive') {
            if (!gdriveLink) return;
        } else if (uploadType === 'video') {
            if (!localVideoFile) {
                alert("Please choose a video file from your computer.");
                return;
            }
        } else {
            if (localFolderFiles.length === 0) {
                alert("Please choose a folder that contains images.");
                return;
            }
            if (topLevelImageFiles.length === 0) {
                if (localFolderFiles.some((f) => IMAGE_EXT.test(f.name))) {
                    alert(
                        "No images in the folder root. Move images out of subfolders, or only files directly in the selected folder are imported.",
                    );
                } else {
                    alert("No supported images found in the folder root. Use .png, .jpg, .jpeg, .webp, .bmp, or .tiff files.");
                }
                return;
            }
        }

        setIsUploading(true);
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const finalOutputName = `${selectedCategory}/${brandName}/${datasetName}`;

        try {
            if (source === 'gdrive') {
                const payload = {
                    gdrive_link: gdriveLink,
                    output_name: finalOutputName,
                    upload_type: uploadType,
                    date,
                    tags,
                    task: task.trim(),
                };
                const response = await fetch("/api/process_video", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                let data: { error?: string } = {};
                try {
                    data = await response.json();
                } catch {
                    data = { error: response.statusText || "Request failed" };
                }
                if (response.ok) {
                    alert("Success: Data uploaded and processed!");
                    if (onSuccess) onSuccess();
                    onClose();
                    resetFormAfterSuccess();
                } else {
                    throw new Error(data.error || "Upload failed");
                }
            } else {
                const fd = new FormData();
                fd.append("upload_type", uploadType);
                fd.append("output_name", finalOutputName);
                fd.append("date", date);
                fd.append("tags", JSON.stringify(tags));
                fd.append("task", task.trim());
                if (uploadType === 'video') {
                    fd.append("file", localVideoFile!);
                } else {
                    topLevelImageFiles.forEach((file) => fd.append("files", file));
                }
                const response = await fetch("/api/process_video", {
                    method: "POST",
                    body: fd,
                });
                let data: { error?: string } = {};
                try {
                    data = await response.json();
                } catch {
                    data = { error: response.statusText || "Request failed" };
                }
                if (response.ok) {
                    alert("Success: Data uploaded and processed!");
                    if (onSuccess) onSuccess();
                    onClose();
                    resetFormAfterSuccess();
                } else {
                    throw new Error(data.error || "Upload failed");
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error: ${message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
            <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-lg p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50"></div>
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="mb-6">
                    <h2 className="text-xl font-bold font-sans-tech text-foreground flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-sm"><Upload className="w-5 h-5 text-primary" /></div>
                        Import Data
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 font-sans-tech">
                        Import from Google Drive or upload a video or image folder from this computer
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-input p-1 rounded-sm flex border border-border">
                        <button
                            type="button"
                            onClick={() => handleSourceChange('gdrive')}
                            className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${source === 'gdrive' ? 'bg-card text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Cloud className="w-4 h-4" />
                            Google Drive
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSourceChange('local')}
                            className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${source === 'local' ? 'bg-card text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HardDrive className="w-4 h-4" />
                            This computer
                        </button>
                    </div>
                    <div className="bg-input p-1 rounded-sm flex border border-border">
                        <button type="button" onClick={() => handleUploadTypeChange('video')} className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${uploadType === 'video' ? 'bg-card text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}><FileVideo className="w-4 h-4" />Video File</button>
                        <button type="button" onClick={() => handleUploadTypeChange('folder')} className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${uploadType === 'folder' ? 'bg-card text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}><Folder className="w-4 h-4" />Image Folder</button>
                    </div>
                    {source === 'gdrive' ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">{uploadType === 'video' ? 'Drive link (video)' : 'Drive link (folder)'}</label>
                            <div className="relative group">
                                <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <input type="text" value={gdriveLink} onChange={(e) => setGdriveLink(e.target.value)} placeholder={uploadType === 'video' ? 'https://drive.google.com/file/d/...' : 'https://drive.google.com/drive/folders/...'} className="w-full bg-input border border-border rounded-sm px-3 py-2 pl-9 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech transition-all placeholder:text-muted-foreground/50" required />
                            </div>
                        </div>
                    ) : uploadType === 'video' ? (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Video file</label>
                            <input
                                key={`local-video-${fileInputKey}`}
                                type="file"
                                accept="video/*"
                                onChange={(e) => setLocalVideoFile(e.target.files?.[0] ?? null)}
                                className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-border file:bg-card file:text-primary file:text-xs file:font-bold file:font-sans-tech file:uppercase cursor-pointer"
                            />
                            {localVideoFile && (
                                <p className="text-xs text-muted-foreground font-sans-tech truncate" title={localVideoFile.name}>
                                    Selected: {localVideoFile.name}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Image folder</label>
                            <input
                                key={`local-folder-${fileInputKey}`}
                                type="file"
                                multiple
                                {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)}
                                onChange={(e) => setLocalFolderFiles(Array.from(e.target.files ?? []))}
                                className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-border file:bg-card file:text-primary file:text-xs file:font-bold file:font-sans-tech file:uppercase cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground font-sans-tech">
                                Only images in the folder itself are imported; files inside subfolders are ignored.
                            </p>
                            {localFolderFiles.length > 0 && (
                                <p className="text-xs text-muted-foreground font-sans-tech">
                                    {topLevelImageFiles.length} image{topLevelImageFiles.length === 1 ? "" : "s"} in folder root
                                    {nestedFileCount > 0
                                        ? ` (${nestedFileCount} in subfolders skipped)`
                                        : ""}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Category</label>
                            <input type="text" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} placeholder="e.g. automotive" pattern="[a-zA-Z0-9]+" className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Brand / Subdir</label>
                            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. bmw" pattern="[a-zA-Z0-9]+" className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">Dataset Name (Output)</label>
                        <input type="text" value={datasetName} onChange={(e) => setDatasetName(e.target.value)} placeholder="e.g. frontGrille" pattern="[a-zA-Z0-9]+" className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">Task Context</label>
                        <input type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. front grille for the car. Leave blank to auto-generate from the dataset name." className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">Metadata Tags</label>
                        <div className="flex gap-2">
                            <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech" />
                            <button type="button" onClick={handleAddTag} className="px-3 py-2 bg-input hover:bg-card border border-border hover:border-primary rounded-sm text-primary transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                        {tags.length > 0 && (<div className="flex flex-wrap gap-2 mt-2">{tags.map((tag, index) => (<div key={index} className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-sm text-xs font-sans-tech flex items-center gap-1 group">{tag}<button type="button" onClick={() => handleRemoveTag(index)} className="text-primary/50 group-hover:text-primary ml-1"><X className="w-3 h-3" /></button></div>))}</div>)}
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                        <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 text-xs font-bold font-sans-tech text-muted-foreground hover:text-foreground transition-colors uppercase">Cancel</button>
                        <button type="submit" disabled={isUploading} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20">{isUploading && <Loader2 className="w-3 h-3 animate-spin" />}{isUploading ? 'Processing...' : 'Start Process'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
