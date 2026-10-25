import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useWebGL } from './useWebGL';
import { EvidenceChainFallback2D } from './fallbacks/2DFallbacks';

interface EvidenceChainProps {
  verifiedHash: string;
  isAnchored: boolean;
  blockNumber?: number;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({
  verifiedHash,
  isAnchored,
  blockNumber = 5410982,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSupported, prefersReducedMotion, isVisible } = useWebGL();

  useEffect(() => {
    if (!isSupported || prefersReducedMotion || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 360;
    const height = 140;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0.5, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0x227a55, 1.2);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    const chainGroup = new THREE.Group();

    // Create 5 consecutive blocks: [-2, -1, 0, 1, 2], where 0 is our anchored report block
    const blockCount = 5;
    for (let i = 0; i < blockCount; i++) {
      const isTargetBlock = i === 2;
      const x = (i - 2) * 1.05;

      const blockGeo = new THREE.BoxGeometry(0.7, 0.5, 0.4);
      const blockMat = new THREE.MeshStandardMaterial({
        color: isTargetBlock ? 0x227a55 : 0x1b4e33,
        roughness: isTargetBlock ? 0.2 : 0.6,
        metalness: isTargetBlock ? 0.7 : 0.3,
      });

      const blockMesh = new THREE.Mesh(blockGeo, blockMat);
      blockMesh.position.set(x, 0, 0);
      chainGroup.add(blockMesh);

      // Connecting chain link
      if (i < blockCount - 1) {
        const linkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45);
        const linkMat = new THREE.MeshStandardMaterial({ color: 0x6a7a71, roughness: 0.4, metalness: 0.6 });
        const linkMesh = new THREE.Mesh(linkGeo, linkMat);
        linkMesh.rotation.z = Math.PI / 2;
        linkMesh.position.set(x + 0.52, 0, 0);
        chainGroup.add(linkMesh);
      }
    }

    chainGroup.rotation.y = -0.15;
    scene.add(chainGroup);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      chainGroup.rotation.y = -0.15 + Math.sin(clock.getElapsedTime() * 0.8) * 0.08;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [verifiedHash, isAnchored, blockNumber, isSupported, prefersReducedMotion, isVisible]);

  if (!isSupported || prefersReducedMotion) {
    return <EvidenceChainFallback2D verifiedHash={verifiedHash} isAnchored={isAnchored} />;
  }

  return (
    <div className="w-full bg-[#0E131A] rounded-lg border border-[#1F2630] p-3 flex flex-col items-center">
      <div className="w-full flex items-center justify-between text-xs px-2 mb-1">
        <span className="font-mono text-zinc-400">SEPOLIA BLOCKCHAIN ANCHOR</span>
        <span className="font-mono text-teal-400 font-semibold">Block #{blockNumber}</span>
      </div>
      <div ref={containerRef} className="w-full h-[140px]" />
      <div className="text-[11px] font-mono text-zinc-500 mt-1 truncate max-w-full px-2">
        Evidence Hash: {verifiedHash}
      </div>
    </div>
  );
};
