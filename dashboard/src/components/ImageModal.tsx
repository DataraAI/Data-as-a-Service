import { useEffect } from 'react';
import { X, Copy, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { ThreeDViewer } from './ThreeDViewer';

interface ImageModalProps {
    image: any;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

export function ImageModal({ image, onClose, onNext, onPrev }: ImageModalProps) {
    if (!image) return null;

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

                </div>
            </div>
        </div>
    );
}
