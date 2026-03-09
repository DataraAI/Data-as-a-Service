// import { Button } from "@/components/ui/button";
import { useEffect, useState } from 'react';
import { X, Loader2, Copy, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { ThreeDViewer } from './ThreeDViewer';

interface ImageModalProps {
    image: any;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onEgoGenSuccess?: () => void;
}

export function ImageModal({ image, onClose, onNext, onPrev, onEgoGenSuccess }: ImageModalProps) {
    if (!image) return null;

    // const [removeHumanBoolean, setRemoveHumanBoolean] = useState(true);
    // const removeHumanBoolean: boolean = true;

    const [selectedCameraWork, setSelectedCameraWork] = useState("Rotate right 45 degrees");

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && onNext) onNext();
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    const [isGeneratingEgo, setIsGeneratingEgo] = useState(false);
    const [cornerCasePrompt, setCornerCasePrompt] = useState("");
    const [isAddingCornerCase, setIsAddingCornerCase] = useState(false);

    const addCornerCase = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = cornerCasePrompt.trim();
        if (!text) return;

        setIsAddingCornerCase(true);
        try {
            const response = await fetch("/api/corner_case", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message || "Corner case submitted successfully.");
                setCornerCasePrompt("");
            } else {
                throw new Error(data.error || "Corner case request failed");
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsAddingCornerCase(false);
        }
    };

    const generateEgoView = async (e: React.FormEvent) => {
        e.preventDefault();
        // if (!gdriveLink || !selectedCategory || !brandName || !datasetName) return;
        if (!selectedCameraWork) return;

        setIsGeneratingEgo(true);

        // const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

        // Construct hierarchical path
        // const finalOutputName = `${selectedCategory}/${brandName}/${datasetName}`;
        var prompt = selectedCameraWork + ", and remove the human(s).";
        // if (removeHumanBoolean) {
            // prompt += ", and remove the human(s)."
        // }

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const payload = {
            prompt: prompt,
            imageURL: image.url, // sending URL of image, instead of the actual image
            date: date,
            tags: ["egocentric", selectedCameraWork, "no human"]
        };
        console.log(JSON.stringify(payload));

        try {
            const response = await fetch("/api/generate_ego", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Success: Ego view generated and processed!");
                if (onEgoGenSuccess) onEgoGenSuccess();
                onClose();
                // Reset form
                setSelectedCameraWork("Rotate right 45 degrees");
                // setRemoveHumanBoolean(true);
            } else {
                throw new Error(data.error || "Ego generation failed");
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsGeneratingEgo(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex bg-background/95 backdrop-blur-md">

            {/* Left Navigation Zone */}
            <div
                className="w-16 flex items-center justify-center hover:bg-primary/5 cursor-pointer transition-colors group"
                onClick={onPrev}
            >
                <ChevronLeft className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                {image.type === '3d' ? (
                    <div className="w-full h-full max-w-4xl border border-border rounded-lg bg-card/50 relative">
                        <ThreeDViewer url={image.proxy_url || image.url} />
                    </div>
                ) : (
                    <img
                        src={image.url}
                        alt={image.name}
                        className="max-h-full max-w-full object-contain rounded-sm shadow-2xl border border-border bg-black/50"
                    />
                )}
            </div>

            {/* Right Navigation Zone */}
            <div
                className="w-16 flex items-center justify-center hover:bg-primary/5 cursor-pointer transition-colors group"
                onClick={onNext}
            >
                <ChevronRight className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            {/* Sidebar Metadata Panel */}
            <div className="w-96 bg-card border-l border-border flex flex-col shadow-2xl z-20">
                <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                    <h2 className="font-bold font-sans-tech text-foreground tracking-tight">Image Details</h2>
                    <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded-sm text-muted-foreground hover:text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="group">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1 font-sans-tech">File Path</label>
                            <div className="flex items-center space-x-2 bg-input p-2 rounded-sm border border-border group-hover:border-primary/50 transition-colors">
                                <code className="text-xs text-primary truncate flex-1 font-sans-tech">{image.name}</code>
                                <button onClick={() => copyToClipboard(image.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="group">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1 font-sans-tech">Blob URL</label>
                            <div className="flex items-center space-x-2 bg-input p-2 rounded-sm border border-border group-hover:border-primary/50 transition-colors">
                                <code className="text-xs text-blue-400 truncate flex-1 font-sans-tech">{image.url}</code>
                                <button onClick={() => copyToClipboard(image.url)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Formatted Metadata */}
                    <div>
                        <div className="flex items-center mb-3">
                            <Info className="w-3 h-3 text-muted-foreground mr-2" />
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans-tech">Properties</label>
                        </div>

                        <div className="bg-background/50 rounded-sm border border-border divide-y divide-border text-[11px] font-sans-tech">
                            {/* Capture Date */}
                            <div className="flex justify-between p-3">
                                <span className="text-muted-foreground font-medium">Date Captured</span>
                                <span className="text-foreground font-sans-tech">
                                    {image.metadata?.date
                                        ? `${image.metadata.date.substring(0, 4)}-${image.metadata.date.substring(4, 6)}-${image.metadata.date.substring(6, 8)}`
                                        : 'N/A'}
                                </span>
                            </div>

                            {/* Upload Date */}
                            <div className="flex justify-between p-3">
                                <span className="text-muted-foreground font-medium">Date Uploaded</span>
                                <span className="text-foreground font-sans-tech">
                                    {image.metadata?.uploaded_at
                                        ? new Date(image.metadata.uploaded_at * 1000).toLocaleString()
                                        : 'N/A'}
                                </span>
                            </div>

                            {/* Sharpness */}
                            <div className="flex justify-between p-3">
                                <span className="text-muted-foreground font-medium">Sharpness Score</span>
                                <span className="text-foreground font-sans-tech">
                                    {typeof image.metadata?.sharpness === 'number'
                                        ? image.metadata.sharpness.toFixed(2)
                                        : 'N/A'}
                                </span>
                            </div>

                            {/* View */}
                            <div className="flex justify-between p-3">
                                <span className="text-muted-foreground font-medium">View Angle</span>
                                <span className="text-foreground font-sans-tech">
                                    {image.metadata?.view || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Corner case — only for ego images */}
                    {image.metadata?.view === "egos" ? (
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2 font-sans-tech">Add corner case</label>
                            <form onSubmit={addCornerCase} className="space-y-3">
                                <input
                                    type="text"
                                    value={cornerCasePrompt}
                                    onChange={(e) => setCornerCasePrompt(e.target.value)}
                                    placeholder="Enter in an object you wish to insert with respect to this image."
                                    className="w-full px-3 py-2 text-sm bg-input rounded-sm border border-border focus:border-primary/50 focus:outline-none font-sans-tech placeholder:text-muted-foreground"
                                />
                                <button
                                    type="submit"
                                    disabled={!cornerCasePrompt.trim() || isAddingCornerCase}
                                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20"
                                >
                                    {isAddingCornerCase && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {isAddingCornerCase ? "Submitting..." : "Add corner case"}
                                </button>
                            </form>
                        </div>
                    ) : null}

                    {image.metadata?.view == "exo" ? (
                        <div>
                            <div className="flex items-center mb-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-sans-tech">Egocentric generation</label>
                            </div>

                            <form onSubmit={generateEgoView} className="space-y-5">
                                <div className="bg-background/50 rounded-sm border border-border divide-y divide-border text-[11px] font-sans-tech">
                                    {/* Ego params */}

                                    {/* Camera work */}
                                    <div className="flex justify-between p-3">
                                        <span className="text-muted-foreground font-medium">New camera view</span>
                                        <select
                                            id="cameraWork"
                                            name="cameraWork"
                                            onChange={(e) => setSelectedCameraWork(e.target.value)}
                                        >
                                            <option value="Rotate right 45 degrees">Rotate right 45 degrees</option>
                                            <option value="Rotate right 90 degrees">Rotate right 90 degrees</option>
                                            <option value="Rotate left 45 degrees">Rotate left 45 degrees</option>
                                            <option value="Rotate left 90 degrees">Rotate left 90 degrees</option>
                                            <option value="Rotate up 45 degrees">Rotate up 45 degrees</option>
                                            <option value="Rotate up 90 degrees">Rotate up 90 degrees</option>
                                            <option value="Rotate down 45 degrees">Rotate down 45 degrees</option>
                                            <option value="Rotate down 90 degrees">Rotate down 90 degrees</option>
                                        </select>
                                    </div>

                                </div>
                                <button
                                    type="submit"
                                    disabled={isGeneratingEgo}
                                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20"
                                >
                                    {isGeneratingEgo && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {isGeneratingEgo ? 'Processing...' : 'Generate Ego View'}
                                </button>
                            </form>
                        </div>
                    ) : ''}

                </div>
            </div>
        </div>
    );
}
