import React, { useEffect } from 'react';
import { X, Copy, ChevronLeft, ChevronRight, Info, Calendar, Activity, Eye, Check } from 'lucide-react';

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
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    return (
        <div className="fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur-sm">

            {/* Left Navigation Zone */}
            <div
                className="w-16 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors"
                onClick={onPrev}
            >
                <ChevronLeft className="w-8 h-8 text-slate-400" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                <img
                    src={image.url}
                    alt={image.name}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
                />
            </div>

            {/* Right Navigation Zone */}
            <div
                className="w-16 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors"
                onClick={onNext}
            >
                <ChevronRight className="w-8 h-8 text-slate-400" />
            </div>

            {/* Sidebar Metadata Panel */}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h2 className="font-bold text-slate-200">Image Details</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">File Path</label>
                            <div className="flex items-center space-x-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                <code className="text-xs text-orange-400 truncate flex-1 font-mono">{image.name}</code>
                                <button onClick={() => copyToClipboard(image.id)} className="text-slate-500 hover:text-white">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Blob URL</label>
                            <div className="flex items-center space-x-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                <code className="text-xs text-blue-400 truncate flex-1 font-mono">{image.url}</code>
                                <button onClick={() => copyToClipboard(image.url)} className="text-slate-500 hover:text-white">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metadata JSON */}
                    <div>
                        <div className="flex items-center mb-2">
                            <Info className="w-3 h-3 text-slate-500 mr-2" />
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Raw Metadata</label>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                            <pre className="text-[10px] text-slate-400 font-mono leading-relaxed">
                                {JSON.stringify(image.tags || {}, null, 2)}
                            </pre>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
