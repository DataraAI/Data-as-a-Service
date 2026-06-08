import { Html, OrbitControls, Stage } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import { AlertTriangle, Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';
import * as THREE from 'three';
import { GLTFLoader, OBJLoader, STLLoader } from 'three-stdlib';

interface ModelProps {
    url: string;
}

function STLModel({ url }: ModelProps) {
    const geometry = useLoader(STLLoader, url);
    geometry.center();
    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial color="#f97316" />
        </mesh>
    );
}

function GLBModel({ url }: ModelProps) {
    const gltf = useLoader(GLTFLoader, url);
    return <primitive object={gltf.scene} />;
}

function OBJModel({ url }: ModelProps) {
    const obj = useLoader(OBJLoader, url);
    // 💡 FIX: Inject a visible material into the OBJ children meshes 
    // so they don't render invisible or pitch black.
    React.useMemo(() => {
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: "#0d9488", // Teal styling to match DataraAI themes
                    roughness: 0.4,
                    metalness: 0.2,
                    side: THREE.DoubleSide // Ensure inside/outside of mesh are visible
                });
            }
        });
    }, [obj]);

    return <primitive object={obj} scale={1} />;
}

function ModelSelector({ url }: ModelProps) {
    const isGLB = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf') || url.toLowerCase().includes('.glb?') || url.toLowerCase().includes('.gltf?');
    const isOBJ = url.toLowerCase().endsWith(".obj");
    // alert("last 10 characters: " + url.substring(url.length - 10));

    if (isGLB) {
        return <GLBModel url={url} />;
    }
    else if (isOBJ) {
        // console.log("Full URL: " + url);
        return <OBJModel url={url} />;
    }
    return <STLModel url={url} />;
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
                            <div className="flex flex-col items-center rounded border border-destructive/40 bg-card/90 p-4 text-destructive shadow-xl backdrop-blur-sm">
                                <AlertTriangle className="w-6 h-6 mb-2" />
                                <span className="text-xs font-mono">Failed to load 3D model</span>
                            </div>
                        </Html>
                    }
                >
                    <Suspense
                        fallback={
                            <Html center>
                                <div className="flex items-center space-x-2 rounded bg-card/90 p-2 text-primary shadow-xl backdrop-blur-sm">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-xs font-mono">Loading Model...</span>
                                </div>
                            </Html>
                        }
                    >
                        <Stage environment="city" intensity={0.6}>
                            <ModelSelector url={url} />
                        </Stage>
                    </Suspense>
                </ErrorBoundary>
                <OrbitControls autoRotate />
            </Canvas>
        </div>
    );
}
