import { useState } from 'react';
import { Upload, X, Loader2, Plus, Link as LinkIcon, Folder, FileVideo } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [gdriveLink, setGdriveLink] = useState("");

    // Hierarchical State
    // const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [brandName, setBrandName] = useState("");
    const [datasetName, setDatasetName] = useState("");
    const [uploadType, setUploadType] = useState<'video' | 'folder'>('video');

    const [isUploading, setIsUploading] = useState(false);

    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");

    // Fetch Categories on mount
    useState(() => {
        fetch('/api/datasets?path=')
            .then(res => res.json())
            .then(data => {
                const cats = data
                    .filter((d: any) => d.type === 'folder')
                    .map((d: any) => d.name);
                // setCategories(cats);
                if (cats.length > 0) setSelectedCategory(cats[0]);
            })
            .catch(err => console.error("Failed to fetch categories", err));
    }); // Using useState as mount effect since React 18 strict mode double invoke fix/habit, or just useEffect

    if (!isOpen) return null;

    const handleAddTag = () => {
        if (currentTag.trim()) {
            setTags([...tags, currentTag.trim()]);
            setCurrentTag("");
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gdriveLink || !selectedCategory || !brandName || !datasetName) return;

        setIsUploading(true);

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

        // Construct hierarchical path
        const finalOutputName = `${selectedCategory}/${brandName}/${datasetName}`;

        const payload = {
            gdrive_link: gdriveLink,
            output_name: finalOutputName,
            upload_type: uploadType,
            date: date,
            tags: tags
        };

        try {
            const response = await fetch("/api/process_video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Success: Video uploaded and processed!");
                if (onSuccess) onSuccess();
                onClose();
                // Reset form
                setGdriveLink("");
                setBrandName("");
                setDatasetName("");
                setTags([]);
                setUploadType('video');
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
            <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-lg p-8 relative overflow-hidden">
                {/* Decorative border at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold font-sans-tech text-foreground flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-sm">
                            <Upload className="w-5 h-5 text-primary" />
                        </div>
                        Import Data
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 font-sans-tech">
                        Import assets via Drive Link
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Upload Type Selector */}
                    <div className="bg-input p-1 rounded-sm flex border border-border">
                        <button
                            type="button"
                            onClick={() => setUploadType('video')}
                            className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${uploadType === 'video'
                                ? 'bg-card text-primary shadow-sm border border-border/50'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <FileVideo className="w-4 h-4" />
                            Video File
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadType('folder')}
                            className={`flex-1 py-2 text-sm font-medium font-sans-tech rounded-sm transition-all flex items-center justify-center gap-2 ${uploadType === 'folder'
                                ? 'bg-card text-primary shadow-sm border border-border/50'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Folder className="w-4 h-4" />
                            Image Folder
                        </button>
                    </div>

                    {/* GDrive Link */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">
                            {uploadType === 'video' ? 'Drive Link (Video)' : 'Drive Link (Folder)'}
                        </label>
                        <div className="relative group">
                            <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <input
                                type="text"
                                value={gdriveLink}
                                onChange={(e) => setGdriveLink(e.target.value)}
                                placeholder={uploadType === 'video' ? "https://drive.google.com/file/d/..." : "https://drive.google.com/drive/folders/..."}
                                className="w-full bg-input border border-border rounded-sm px-3 py-2 pl-9 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech transition-all placeholder:text-muted-foreground/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Level 1: Category */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Category</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    placeholder="e.g. automotive"
                                    pattern="[a-zA-Z0-9]+"
                                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                                    required
                                />
                            </div>
                        </div>

                        {/* Level 2: Brand */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground font-sans-tech">Brand / Subdir</label>
                            <input
                                type="text"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                placeholder="e.g. bmw"
                                pattern="[a-zA-Z0-9]+"
                                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                                required
                            />
                        </div>
                    </div>

                    {/* Level 3: Dataset Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">Dataset Name (Output)</label>
                        <input
                            type="text"
                            value={datasetName}
                            onChange={(e) => setDatasetName(e.target.value)}
                            placeholder="e.g. frontGrille"
                            pattern="[a-zA-Z0-9]+"
                            className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                            required
                        />
                    </div>


                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground font-sans-tech">Metadata Tags</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                placeholder="Add tag..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-3 py-2 bg-input hover:bg-card border border-border hover:border-primary rounded-sm text-primary transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, index) => (
                                    <div key={index} className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-sm text-xs font-sans-tech flex items-center gap-1 group">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(index)}
                                            className="text-primary/50 group-hover:text-primary ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="px-4 py-2 text-xs font-bold font-sans-tech text-muted-foreground hover:text-foreground transition-colors uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20"
                        >
                            {isUploading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isUploading ? 'Processing...' : 'Start Process'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
