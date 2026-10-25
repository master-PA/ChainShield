import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useWebGL } from './useWebGL';
import { HeroFallback2D } from './fallbacks/2DFallbacks';

export const HeroScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSupported, prefersReducedMotion, isVisible } = useWebGL();

  useEffect(() => {
    if (!isSupported || prefersReducedMotion || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Soft Matte Lighting (no neon glow, per prompt specification)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x2e8b63, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x227a55, 0.8);
    dirLight2.position.set(-5, -3, 3);
    scene.add(dirLight2);

    // 3. Shield Group with Linked Chain Blocks
    const shieldGroup = new THREE.Group();

    // Matte materials
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x12321f,
      roughness: 0.45,
      metalness: 0.35,
    });
    const chainMaterial = new THREE.MeshStandardMaterial({
      color: 0x227a55,
      roughness: 0.3,
      metalness: 0.7,
    });
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e8b63,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Central low-poly shield shape
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-1.2, 1.4);
    shieldShape.lineTo(1.2, 1.4);
    shieldShape.lineTo(1.1, -0.4);
    shieldShape.lineTo(0, -1.8);
    shieldShape.lineTo(-1.1, -0.4);
    shieldShape.closePath();

    const extrudeSettings = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMaterial);
    shieldGroup.add(shieldMesh);

    // Linked Chain Blocks around the shield perimeter
    const chainLinksCount = 8;
    for (let i = 0; i < chainLinksCount; i++) {
      const angle = (i / chainLinksCount) * Math.PI * 2;
      const radiusX = 1.65;
      const radiusY = 1.85;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;

      // Small interlocking torus block
      const linkGeo = new THREE.TorusGeometry(0.24, 0.07, 8, 16);
      const linkMesh = new THREE.Mesh(linkGeo, chainMaterial);
      linkMesh.position.set(x, y, 0.1);
      linkMesh.rotation.z = angle + Math.PI / 4;
      linkMesh.rotation.x = i % 2 === 0 ? 0.3 : -0.3;
      shieldGroup.add(linkMesh);
    }

    // Central cryptographic anchor core emblem
    const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
    const coreMesh = new THREE.Mesh(coreGeo, coreMaterial);
    coreMesh.position.set(0, 0, 0.3);
    shieldGroup.add(coreMesh);

    scene.add(shieldGroup);

    // 4. Subtle Parallax & Rotation
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return; // Pause rendering when tab is hidden

      const delta = clock.getDelta();
      // Slow rotation
      shieldGroup.rotation.y += delta * 0.45;
      coreMesh.rotation.y -= delta * 0.9;
      coreMesh.rotation.x += delta * 0.5;

      // Gentle mouse parallax damping
      shieldGroup.rotation.x = THREE.MathUtils.lerp(shieldGroup.rotation.x, mouseY * 0.25, 0.05);
      shieldGroup.position.x = THREE.MathUtils.lerp(shieldGroup.position.x, mouseX * 0.15, 0.05);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      shieldGeo.dispose();
      coreGeo.dispose();
      if (container) container.innerHTML = '';
    };
  }, [isSupported, prefersReducedMotion, isVisible]);

  if (!isSupported || prefersReducedMotion) {
    return <HeroFallback2D />;
  }

  return <div ref={containerRef} className="w-full h-[380px] flex items-center justify-center cursor-grab" />;
};
