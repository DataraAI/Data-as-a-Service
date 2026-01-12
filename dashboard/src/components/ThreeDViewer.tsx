import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Html } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ModelProps {
    url: string;
}

function Model({ url }: ModelProps) {
    const geometry = useLoader(STLLoader, url);
    geometry.center();

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial color="#f97316" /> {/* Orange-500 */}
        </mesh>
    );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

interface ThreeDViewerProps {
    url: string;
}

export function ThreeDViewer({ url }: ThreeDViewerProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas shadows gl={{ antialias: true }} camera={{ position: [0, 0, 150], fov: 50 }}>
                <ErrorBoundary
                    fallback={
                        <Html center>
                            <div className="flex flex-col items-center bg-slate-900/80 p-4 rounded border border-red-500 text-red-500">
                                <AlertTriangle className="w-6 h-6 mb-2" />
                                <span className="text-xs font-mono">Failed to load 3D model</span>
                            </div>
                        </Html>
                    }
                >
                    <Suspense
                        fallback={
                            <Html center>
                                <div className="flex items-center space-x-2 text-orange-500 bg-slate-900/80 p-2 rounded">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-xs font-mono">Loading Model...</span>
                                </div>
                            </Html>
                        }
                    >
                        <Stage environment="city" intensity={0.6}>
                            <Model url={url} />
                        </Stage>
                    </Suspense>
                </ErrorBoundary>
                <OrbitControls autoRotate />
            </Canvas>
        </div>
    );
}
