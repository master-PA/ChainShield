import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useWebGL } from './useWebGL';
import { ThreatGlobeFallback2D } from './fallbacks/2DFallbacks';

interface ThreatPoint {
  lat: number;
  lng: number;
  name: string;
  category: string;
  count: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'CAUTION';
}

const THREAT_POINTS: ThreatPoint[] = [
  { lat: 37.7749, lng: -122.4194, name: 'San Francisco, US', category: 'drainer', count: 412, threatLevel: 'CRITICAL' },
  { lat: 40.7128, lng: -74.006, name: 'New York, US', category: 'lookalike', count: 289, threatLevel: 'HIGH' },
  { lat: 51.5074, lng: -0.1278, name: 'London, UK', category: 'honeypot', count: 184, threatLevel: 'HIGH' },
  { lat: 48.8566, lng: 2.3522, name: 'Paris, FR', category: 'drainer', count: 210, threatLevel: 'CRITICAL' },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore, SG', category: 'approval_trap', count: 320, threatLevel: 'CRITICAL' },
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo, JP', category: 'lookalike', count: 145, threatLevel: 'CAUTION' },
  { lat: 28.6139, lng: 77.209, name: 'Delhi, IN', category: 'fake_airdrop', count: 290, threatLevel: 'HIGH' },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney, AU', category: 'drainer', count: 98, threatLevel: 'CAUTION' },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const ThreatGlobe: React.FC<{ selectedCategory?: string }> = ({ selectedCategory }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSupported, prefersReducedMotion, isVisible } = useWebGL();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported || prefersReducedMotion || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Matte lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight.position.set(3, 4, 3);
    scene.add(dirLight);

    const globeRadius = 1.6;
    const globeGroup = new THREE.Group();

    // Wireframe base sphere
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: true,
      wireframeLinewidth: 1,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Solid inner core
    const innerGeo = new THREE.SphereGeometry(globeRadius * 0.98, 20, 20);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x0b0f14 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    globeGroup.add(innerMesh);

    // Threat markers
    const markers: THREE.Mesh[] = [];
    const filteredPoints = selectedCategory
      ? THREAT_POINTS.filter((p) => p.category === selectedCategory || selectedCategory === 'all')
      : THREAT_POINTS;

    filteredPoints.forEach((point) => {
      const pos = latLngToVector3(point.lat, point.lng, globeRadius + 0.05);
      const isCritical = point.threatLevel === 'CRITICAL';
      const markerColor = isCritical ? 0xef4444 : point.threatLevel === 'HIGH' ? 0xf97316 : 0xf59e0b;

      const markerGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const markerMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        roughness: 0.3,
        metalness: 0.7,
      });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.copy(pos);
      markerMesh.userData = point;
      globeGroup.add(markerMesh);
      markers.push(markerMesh);
    });

    // Create 2 connection arcs representing drainer relay paths
    const p1 = latLngToVector3(37.7749, -122.4194, globeRadius);
    const p2 = latLngToVector3(51.5074, -0.1278, globeRadius);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(globeRadius * 1.35);

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const curvePoints = curve.getPoints(30);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcMat = new THREE.LineBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.75 });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    globeGroup.add(arcLine);

    scene.add(globeGroup);

    // Mouse drag rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      if (!isDragging) {
        globeGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sphereGeo.dispose();
      innerGeo.dispose();
      if (container) container.innerHTML = '';
    };
  }, [isSupported, prefersReducedMotion, isVisible, selectedCategory]);

  if (!isSupported || prefersReducedMotion) {
    return <ThreatGlobeFallback2D selectedCategory={selectedCategory} />;
  }

  return (
    <div className="relative w-full h-[320px] bg-[#0E131A] rounded-lg border border-[#1F2630] overflow-hidden flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-3 left-3 text-[11px] font-mono text-zinc-400 bg-[#161D26]/90 px-2.5 py-1 rounded border border-[#1F2630] pointer-events-none">
        THREAT GLOBE: ACTIVE NODES ({THREAT_POINTS.length})
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-zinc-500 bg-[#161D26]/80 px-2 py-0.5 rounded pointer-events-none">
        Drag to rotate
      </div>
    </div>
  );
};
