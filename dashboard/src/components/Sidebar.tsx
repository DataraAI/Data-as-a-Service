import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SidebarProps {
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    availableTags: string[];
    visibleTags: Set<string>;
    onToggleTag: (tag: string) => void;
    onUploadClick: () => void;
}

export function Sidebar({ filters, onFilterChange, availableTags, visibleTags, onToggleTag, onUploadClick }: SidebarProps) {
    const [expandedSections, setExpandedSections] = useState({
        tags: true
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="w-80 h-full bg-sidebar border-r border-sidebar-border flex flex-col text-sidebar-foreground">
            {/* Header / Upload */}
            <div className="p-4 border-b border-sidebar-border space-y-4">
                <Button
                    onClick={onUploadClick}
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                </Button>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filter images..."
                        className="w-full bg-sidebar-accent/50 border border-sidebar-border rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder-muted-foreground"
                        onChange={(e) => onFilterChange('text', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Tags Section */}
                <div>
                    <button
                        onClick={() => toggleSection('tags')}
                        className="flex items-center w-full text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground"
                    >
                        {expandedSections.tags ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                        Tags & Labels
                    </button>
                    {expandedSections.tags && (
                        <div className="space-y-2 px-2">
                            {availableTags && availableTags.length > 0 ? (
                                availableTags.map(tag => (
                                    <div
                                        key={tag}
                                        className="flex items-center justify-between group cursor-pointer px-2 py-1.5 rounded hover:bg-sidebar-accent transition-colors"
                                        onClick={() => onToggleTag(tag)}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-3 h-3 border rounded mr-2 flex items-center justify-center transition-colors ${visibleTags.has(tag) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                                {visibleTags.has(tag) && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}
                                            </div>
                                            <span className="text-sm truncate opacity-90" title={tag}>{tag}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground italic">No specific tags loaded</div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
                <div className="flex justify-between">
                    <span>Datara AI</span>
                    <span>v0.1</span>
                </div>
            </div>
        </div>
    );
}
