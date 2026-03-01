import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [connectionString, setConnectionString] = useState("");
    const [outputName, setOutputName] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");

    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

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
        if (!file || !connectionString) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("connection_string", connectionString);
        uploadData.append("output_name", outputName);

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
        uploadData.append("date", date);
        uploadData.append("tags", JSON.stringify(tags));

        try {
            const response = await fetch("http://localhost:5050/process_video", {
                method: "POST",
                body: uploadData,
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Video uploaded and processed successfully!",
                });
                onClose();
                // Reset form
                setFile(null);
                setConnectionString("");
                setOutputName("");
                setTags([]);
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload Video</DialogTitle>
                    <DialogDescription>
                        Upload video, tags, and Azure connection details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="video" className="text-right">Video</Label>
                            <Input id="video" type="file" accept="video/*" onChange={handleFileChange} className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="outputName" className="text-right">Dataset Name</Label>
                            <Input id="outputName" pattern="[a-zA-Z0-9]+" value={outputName} onChange={(e) => setOutputName(e.target.value)} placeholder="e.g. bmwTest" className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="connectionString" className="text-right">Azure Blob Key</Label>
                            <Input id="connectionString" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="Blob Storage Connection String" className="col-span-3" required />
                        </div>

                        <div className="border-t my-2"></div>
                        <h3 className="font-semibold mb-2">Misc Tags</h3>

                        <div className="flex gap-2">
                            <Input
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                placeholder="Add a tag..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddTag} variant="outline">+</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map((tag, index) => (
                                <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => handleRemoveTag(index)} className="hover:text-destructive">×</button>
                                </div>
                            ))}
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
