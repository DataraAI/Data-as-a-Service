import { Html, OrbitControls, Stage } from '@react-three/drei';
import { Canvas, useLoader } from '@react-three/fiber';
import { AlertTriangle, Loader2 } from 'lucide-react';
import React, { Suspense } from 'react';
import * as THREE from 'three';
import { GLTFLoader, OBJLoader, STLLoader } from 'three-stdlib';

interface ModelProps {
    url: string;
    fileName?: string;
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
    React.useMemo(() => {
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(1, 1, 1);

        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
                child.geometry.center();

                child.material = new THREE.MeshStandardMaterial({
                    color: "#0d9488",
                    roughness: 0.4,
                    metalness: 0.2,
                    side: THREE.DoubleSide
                });
            }
        });
    }, [obj]);

    React.useEffect(() => {
        return () => {
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        };
    }, [obj]);

    return <primitive object={obj} scale={1} />;
}

function ModelSelector({ url, fileName }: ModelProps) {
    const formatSource = (fileName || url).toLowerCase();
    const isGLB = formatSource.endsWith('.glb') || formatSource.endsWith('.gltf') || formatSource.includes('.glb?') || formatSource.includes('.gltf?');
    const isOBJ = formatSource.endsWith(".obj") || formatSource.includes(".obj?");

    if (isGLB) {
        return <GLBModel url={url} />;
    }

    else if (isOBJ) {
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
    fileName?: string;
}

export function ThreeDViewer({ url, fileName }: ThreeDViewerProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas shadows gl={{ antialias: true }} camera={{ position: [0, 0, .3], fov: 50 }}>
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
                        <Stage environment="city" intensity={0.6} adjustCamera={false}>
                            <ModelSelector url={url} fileName={fileName} />
                        </Stage>
                    </Suspense>
                </ErrorBoundary>
                <OrbitControls makeDefault autoRotate={false} enableDamping />
            </Canvas>
        </div>
    );
}
