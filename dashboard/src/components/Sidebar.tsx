import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Hash, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button.tsx";

interface SidebarProps {
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    availableTags: string[];
    visibleTags: Set<string>;
    onToggleTag: (tag: string) => void;
    visiblePrimitives: Set<string>;
    onTogglePrimitive: (primitive: string) => void;
    onUploadClick: () => void;
}

type SectionKey = 'filter' | 'tags' | 'metadata' | 'labels' | 'primitives';

export function Sidebar({ onFilterChange, availableTags, visibleTags, onToggleTag, visiblePrimitives, onTogglePrimitive, onUploadClick }: SidebarProps) {
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
        <div className="w-72 h-full bg-sidebar-background border-r border-border flex flex-col text-muted-foreground font-sans-tech text-xs z-20">
            {/* Top Action Bar */}
            <div className="p-3 border-b border-border flex items-center justify-between bg-background/50">
                <span className="font-sans-tech font-bold text-foreground">Unsaved View</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* FILTER Section */}
                <div className="border-b border-border">
                    <button
                        onClick={() => toggleSection('filter')}
                        className="flex items-center w-full px-4 py-3 hover:bg-background/80 transition-colors group"
                    >
                        {expandedSections.filter ? <ChevronDown className="w-3 h-3 mr-2 text-primary" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                        <span className="font-sans-tech font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">Filters</span>
                    </button>

                    {expandedSections.filter && (
                        <div className="px-4 pb-4 space-y-3 bg-background/30">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Filter samples..."
                                    className="w-full bg-input border border-border rounded-sm py-1.5 pl-8 pr-2 text-xs focus:border-primary focus:outline-none placeholder-muted-foreground text-foreground font-sans-tech"
                                    onChange={(e) => onFilterChange('text', e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={onUploadClick}
                                size="sm"
                                variant="outline"
                                className="w-full h-8 text-xs border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary font-sans-tech"
                            >
                                <Plus className="w-3 h-3 mr-1.5" />
                                Add Stage
                            </Button>
                        </div>
                    )}
                </div>

                {/* LABELS Section (Our Tags) */}
                <div className="border-b border-border">
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-background/80 group cursor-pointer" onClick={() => toggleSection('labels')}>
                        <div className="flex items-center">
                            {expandedSections.labels ? <ChevronDown className="w-3 h-3 mr-2 text-primary" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                            <span className="font-sans-tech font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">Labels</span>
                        </div>
                        <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded text-primary font-sans-tech">{availableTags.length}</span>
                    </div>

                    {expandedSections.labels && (
                        <div className="px-2 pb-2 space-y-0.5 bg-background/30">
                            {availableTags.map((tag, idx) => {
                                const isVisible = visibleTags.has(tag);
                                // Technical palette
                                const colors = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500'];
                                const colorClass = colors[idx % colors.length];

                                return (
                                    <div
                                        key={tag}
                                        className={`flex items-center justify-between px-3 py-1.5 rounded-sm cursor-pointer transition-colors ${isVisible ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-background/50 border-l-2 border-transparent'}`}
                                        onClick={() => onToggleTag(tag)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-sm flex items-center justify-center border transition-colors ${isVisible ? `border-transparent ${colorClass}` : 'border-border bg-transparent'}`}>
                                                {isVisible && <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90" />}
                                            </div>
                                            <span className={`transition-colors font-sans-tech ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}>{tag}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Placeholder for count or actions */}
                                            <span className="text-muted-foreground text-[10px] font-sans-tech">100</span>
                                        </div>
                                    </div>
                                )
                            })}
                            {availableTags.length === 0 && (
                                <div className="px-4 py-2 text-muted-foreground italic font-sans-tech text-[10px]">No labels found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* PRIMITIVES Section (Static Fields) */}
                <div className="border-b border-border">
                    <button
                        onClick={() => toggleSection('primitives')}
                        className="flex items-center w-full px-4 py-3 hover:bg-background/80 transition-colors group"
                    >
                        {expandedSections.primitives ? <ChevronDown className="w-3 h-3 mr-2 text-primary" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                        <span className="font-sans-tech font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">Metadata</span>
                    </button>
                    {expandedSections.primitives && (
                        <div className="px-2 pb-2 space-y-0.5 bg-background/30">
                            {[
                                { icon: Hash, label: "id" },
                                { icon: Hash, label: "frame_id" },
                                { icon: FileText, label: "filepath" },
                                { icon: Hash, label: "width" },
                                { icon: Hash, label: "height" },
                            ].map(item => {
                                const isVisible = visiblePrimitives.has(item.label);
                                return (
                                    <div
                                        key={item.label}
                                        className={`flex items-center px-3 py-1.5 rounded-sm cursor-pointer transition-colors ${isVisible ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border-r-2 border-transparent'}`}
                                        onClick={() => onTogglePrimitive(item.label)}
                                    >
                                        <div className={`w-3 h-3 border rounded-sm mr-2 flex items-center justify-center ${isVisible ? 'border-primary bg-primary/20' : 'border-border bg-card'}`}>
                                            {isVisible && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                        </div>
                                        <item.icon className={`w-3 h-3 mr-2 ${isVisible ? 'text-primary' : 'opacity-50'}`} />
                                        <span className="font-sans-tech">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* Bottom Info */}
            <div className="p-3 border-t border-border text-[10px] text-muted-foreground flex justify-between bg-background font-sans-tech select-none">
                <span>v0.1.0</span>
                <span>Datara AI Systems</span>
            </div>
        </div>
    );
}
