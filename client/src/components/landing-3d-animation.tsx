import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  className?: string;
};

function cssVarToColor(varName: string, fallback: string) {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(varName).trim();
  if (!raw) return new THREE.Color(fallback);

  // Expected format from shadcn: "H S% L%" (space separated).
  // We convert to hsl(H, S%, L%) string for THREE.Color.
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const h = parts[0];
    const s = parts[1];
    const l = parts[2];
    return new THREE.Color(`hsl(${h}, ${s}, ${l})`);
  }

  return new THREE.Color(fallback);
}

export default function Landing3DAnimation({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const colorA = cssVarToColor("--chart-1", "#60a5fa");
    const colorB = cssVarToColor("--chart-2", "#a78bfa");
    const colorC = cssVarToColor("--muted-foreground", "#94a3b8");

    // Subtle ambient + key light for depth.
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 2, 3);
    scene.add(key);

    // Group so we can rotate the whole "network".
    const group = new THREE.Group();
    scene.add(group);

    // Particles.
    const count = 220;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Points in a slightly flattened sphere.
      const r = 1.6 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[idx + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.cos(phi) * 0.65;
      positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
      speeds[i] = 0.15 + Math.random() * 0.35;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      color: colorB,
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    // Connection lines (sampled edges).
    const lineCount = 120;
    const linePositions = new Float32Array(lineCount * 2 * 3);

    for (let i = 0; i < lineCount; i++) {
      const a = Math.floor(Math.random() * count);
      const b = (a + 1 + Math.floor(Math.random() * 12)) % count;
      const ai = a * 3;
      const bi = b * 3;
      const li = i * 6;
      linePositions[li + 0] = positions[ai + 0];
      linePositions[li + 1] = positions[ai + 1];
      linePositions[li + 2] = positions[ai + 2];
      linePositions[li + 3] = positions[bi + 0];
      linePositions[li + 4] = positions[bi + 1];
      linePositions[li + 5] = positions[bi + 2];
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );

    const lineMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.18,
      color: colorC,
    });

    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    // Accent ring.
    const ringGeo = new THREE.TorusGeometry(1.55, 0.03, 12, 160);
    const ringMat = new THREE.MeshStandardMaterial({
      color: colorA,
      metalness: 0.15,
      roughness: 0.35,
      transparent: true,
      opacity: 0.55,
      emissive: colorA,
      emissiveIntensity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.25;
    group.add(ring);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    resize();

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      // Gentle rotation.
      group.rotation.y = t * 0.12;
      group.rotation.x = Math.sin(t * 0.25) * 0.08;

      // Small breathing motion.
      ring.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);

      // Tiny drift in particle Y to create life.
      const posAttr = geometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const baseY = positions[idx + 1];
        posAttr.array[idx + 1] = baseY + Math.sin(t * speeds[i] + i) * 0.03;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    if (!prefersReducedMotion) {
      raf = window.requestAnimationFrame(animate);
    } else {
      renderer.render(scene, camera);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro.disconnect();

      ringGeo.dispose();
      ringMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      geometry.dispose();
      material.dispose();

      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
