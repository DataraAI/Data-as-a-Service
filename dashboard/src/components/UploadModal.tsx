import { useState } from 'react';
import { Upload, X, Loader2, Plus, Link as LinkIcon } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [gdriveLink, setGdriveLink] = useState("");
    const [outputName, setOutputName] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");

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
        if (!gdriveLink) return;

        setIsUploading(true);

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

        const payload = {
            gdrive_link: gdriveLink,
            output_name: outputName,
            date: date,
            tags: tags // Backend expects regex or list? Previous code used JSON.stringify(tags), but if we send JSON body we can send array directly if backend supports it, check backend. 
            // Previous backend: `tags_json = request.form.get("tags", "[]")` then `json.loads`. 
            // I will send it as an object property, backend needs to be updated to read JSON body anyway.
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
                setOutputName("");
                setTags([]);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-orange-500" />
                        Import from Google Drive
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Provide a public Google Drive link to process.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* GDrive Link */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Google Drive Link</label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={gdriveLink}
                                onChange={(e) => setGdriveLink(e.target.value)}
                                placeholder="https://drive.google.com/file/d/..."
                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pl-9 text-sm text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Dataset Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Dataset Name (Output)</label>
                        <input
                            type="text"
                            value={outputName}
                            onChange={(e) => setOutputName(e.target.value)}
                            placeholder="e.g. bmwTest"
                            pattern="[a-zA-Z0-9]+"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                            required
                        />
                    </div>


                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Misc Tags (e.g. location, conditions)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                placeholder="Add a tag..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, index) => (
                                    <div key={index} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 group">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(index)}
                                            className="text-slate-500 group-hover:text-red-400 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isUploading ? 'Processing...' : 'Start Process'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
