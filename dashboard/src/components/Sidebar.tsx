import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Hash, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button.tsx";

interface SidebarProps {
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    availableTags: string[];
    visibleTags: Set<string>;
    onToggleTag: (tag: string) => void;
    onUploadClick: () => void;
}

type SectionKey = 'filter' | 'tags' | 'metadata' | 'labels' | 'primitives';

export function Sidebar({ onFilterChange, availableTags, visibleTags, onToggleTag, onUploadClick }: SidebarProps) {
    const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
        filter: true,
        tags: true,
        metadata: false,
        labels: true,
        primitives: false
    });

    const toggleSection = (section: SectionKey) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="w-72 h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-300 font-sans text-xs">
            {/* Top Action Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <span className="font-bold text-slate-400">Unsaved view</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* FILTER Section */}
                <div className="border-b border-slate-800/50">
                    <button
                        onClick={() => toggleSection('filter')}
                        className="flex items-center w-full px-4 py-3 hover:bg-slate-900 transition-colors group"
                    >
                        {expandedSections.filter ? <ChevronDown className="w-3 h-3 mr-2" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                        <span className="font-bold tracking-wider text-slate-400 group-hover:text-slate-200">FILTER</span>
                    </button>

                    {expandedSections.filter && (
                        <div className="px-4 pb-4 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filter samples..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded py-1.5 pl-8 pr-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none placeholder-slate-600 text-slate-200"
                                    onChange={(e) => onFilterChange('text', e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={onUploadClick}
                                size="sm"
                                variant="secondary"
                                className="w-full h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            >
                                <Plus className="w-3 h-3 mr-1.5" />
                                Add Stage
                            </Button>
                        </div>
                    )}
                </div>

                {/* LABELS Section (Our Tags) */}
                <div className="border-b border-slate-800/50">
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-900 group cursor-pointer" onClick={() => toggleSection('labels')}>
                        <div className="flex items-center">
                            {expandedSections.labels ? <ChevronDown className="w-3 h-3 mr-2 text-slate-500" /> : <ChevronRight className="w-3 h-3 mr-2 text-slate-500" />}
                            <span className="font-bold tracking-wider text-slate-400 group-hover:text-slate-200">LABELS</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{availableTags.length}</span>
                    </div>

                    {expandedSections.labels && (
                        <div className="px-2 pb-2 space-y-0.5">
                            {availableTags.map((tag, idx) => {
                                const isVisible = visibleTags.has(tag);
                                // Generate a color based on index roughly matching the screenshot palette
                                const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'];
                                const colorClass = colors[idx % colors.length];

                                return (
                                    <div
                                        key={tag}
                                        className={`flex items-center justify-between px-3 py-1.5 rounded cursor-pointer transition-colors ${isVisible ? 'bg-slate-800/50' : 'hover:bg-slate-900'}`}
                                        onClick={() => onToggleTag(tag)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded flex items-center justify-center border transition-colors ${isVisible ? `border-transparent ${colorClass}` : 'border-slate-600 bg-transparent'}`}>
                                                {isVisible && <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90" />}
                                            </div>
                                            <span className={`transition-colors ${isVisible ? 'text-slate-200' : 'text-slate-500'}`}>{tag}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Placeholder for count or actions */}
                                            <span className="text-slate-600 text-[10px]">100</span>
                                        </div>
                                    </div>
                                )
                            })}
                            {availableTags.length === 0 && (
                                <div className="px-4 py-2 text-slate-600 italic">No labels found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* PRIMITIVES Section (Static Fields) */}
                <div className="border-b border-slate-800/50">
                    <button
                        onClick={() => toggleSection('primitives')}
                        className="flex items-center w-full px-4 py-3 hover:bg-slate-900 transition-colors group"
                    >
                        {expandedSections.primitives ? <ChevronDown className="w-3 h-3 mr-2" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                        <span className="font-bold tracking-wider text-slate-400 group-hover:text-slate-200">PRIMITIVES</span>
                    </button>
                    {expandedSections.primitives && (
                        <div className="px-2 pb-2 space-y-0.5">
                            {[
                                { icon: Hash, label: "id" },
                                { icon: FileText, label: "filepath" },
                                { icon: FileText, label: "metadata" },
                            ].map(item => (
                                <div key={item.label} className="flex items-center px-3 py-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded cursor-not-allowed opacity-70">
                                    <div className="w-3 h-3 border border-slate-700 rounded mr-2 bg-slate-800/50"></div>
                                    <item.icon className="w-3 h-3 mr-2 opacity-50" />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Bottom Info */}
            <div className="p-3 border-t border-slate-800 text-[10px] text-slate-600 flex justify-between bg-slate-950">
                <span>v0.1.0</span>
                <span>Datara AI</span>
            </div>
        </div>
    );
}
