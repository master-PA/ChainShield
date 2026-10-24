import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useWebGL } from './useWebGL';
import { RiskCoreFallback2D } from './fallbacks/2DFallbacks';
import { RiskLevel } from '../types/security';

interface RiskCoreProps {
  score: number;
  level: RiskLevel;
}

export const RiskCore: React.FC<RiskCoreProps> = ({ score, level }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSupported, prefersReducedMotion, isVisible } = useWebGL();

  useEffect(() => {
    if (!isSupported || prefersReducedMotion || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const width = 120;
    const height = 120;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    const group = new THREE.Group();

    // Color and geometry determination based on score
    let hexColor = 0x10b981; // emerald
    if (score >= 75) {
      hexColor = 0xef4444; // rose/red
    } else if (score >= 50) {
      hexColor = 0xf97316; // orange
    } else if (score >= 25) {
      hexColor = 0xf59e0b; // amber
    }

    const material = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.35,
      metalness: 0.6,
      wireframe: false,
    });

    if (score < 25) {
      // LOW: Smooth octahedron shield core
      const geo = new THREE.OctahedronGeometry(1.0, 1);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
    } else if (score < 50) {
      // CAUTION: Faceted Dodecahedron
      const geo = new THREE.DodecahedronGeometry(1.0, 0);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
    } else if (score < 75) {
      // HIGH: Spiky Icosahedron
      const geo = new THREE.IcosahedronGeometry(1.1, 0);
      const mesh = new THREE.Mesh(geo, material);
      group.add(mesh);
    } else {
      // CRITICAL: Fractured cluster with separated rotating shard pieces
      const shardGeo = new THREE.TetrahedronGeometry(0.45, 0);
      const shardOffsets = [
        [0.4, 0.4, 0.3],
        [-0.4, 0.3, -0.2],
        [0.3, -0.5, 0.2],
        [-0.3, -0.4, -0.3],
        [0.0, 0.6, -0.4],
      ];

      shardOffsets.forEach(([x, y, z]) => {
        const shard = new THREE.Mesh(shardGeo, material);
        shard.position.set(x, y, z);
        shard.rotation.set(x * 2, y * 3, z * 2);
        group.add(shard);
      });
    }

    scene.add(group);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      group.rotation.y += delta * (score >= 75 ? 1.6 : 0.8);
      group.rotation.x += delta * (score >= 75 ? 1.0 : 0.4);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [score, level, isSupported, prefersReducedMotion, isVisible]);

  if (!isSupported || prefersReducedMotion) {
    return <RiskCoreFallback2D score={score} level={level} />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#11161D] border border-[#1F2630]">
      <div ref={containerRef} className="w-[120px] h-[120px]" />
      <span className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-wider">
        3D Risk Core
      </span>
    </div>
  );
};
