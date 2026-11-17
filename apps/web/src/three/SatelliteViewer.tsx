import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Loadout } from '@ofw/simulation';
import { buildSatellite, type SatelliteRig } from './satelliteModel';
import { webglAvailable } from './webgl';
import { SatelliteFallback } from './SatelliteFallback';

/** Interactive 3D preview of the notional satellite, rebuilt when the loadout changes. */
export function SatelliteViewer({ loadout, reducedMotion, deployOnMount = true }: { loadout: Loadout; reducedMotion: boolean; deployOnMount?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setLoadout(l: Loadout): void } | null>(null);
  const motionRef = useRef(reducedMotion);
  motionRef.current = reducedMotion;

  useEffect(() => {
    const el = host.current;
    if (!el || !webglAvailable()) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    camera.position.set(5.3, 2.2, 6.3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 14;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI - 0.35;
    controls.target.set(0, -0.05, 0);
    const sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
    sun.position.set(4, 3, 2);
    const rim = new THREE.DirectionalLight(0x3fd0e0, 1.4);
    rim.position.set(-3, -1, -3);
    scene.add(sun, rim, new THREE.HemisphereLight(0x9fb8d8, 0x0a1020, 0.5));

    // Faint reference grid below the craft
    const grid = new THREE.PolarGridHelper(3, 12, 6, 64, 0x22324a, 0x182437);
    grid.position.y = -1.25;
    scene.add(grid);

    let rig: SatelliteRig | null = null;
    let deployStart = deployOnMount && !motionRef.current ? performance.now() : -1;
    const holder = new THREE.Group();
    scene.add(holder);
    let pulse = 0;
    const setLoadout = (l: Loadout) => {
      if (rig) {
        holder.remove(rig.group);
        rig.dispose();
      }
      rig = buildSatellite(l);
      rig.setDeploy(deployStart >= 0 ? 0 : 1);
      holder.add(rig.group);
      pulse = 1;
    };
    api.current = { setLoadout };
    setLoadout(loadout);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const t = (now - t0) / 1000;
      if (deployStart >= 0 && rig) {
        const d = Math.min(1, (now - deployStart) / 2200);
        rig.setDeploy(d);
        if (d >= 1) deployStart = -1;
      }
      if (!motionRef.current) holder.rotation.y = t * 0.18;
      holder.position.y = motionRef.current ? 0 : Math.sin(t * 0.8) * 0.03;
      if (pulse > 0) {
        pulse = Math.max(0, pulse - 0.04);
        const s = 1 + pulse * 0.04;
        holder.scale.setScalar(s);
      }
      rig?.tick(t);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      if (rig) rig.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.setLoadout(loadout);
  }, [loadout]);

  if (!webglAvailable()) return <SatelliteFallback loadout={loadout} />;
  return <div ref={host} className="sat-viewer" aria-label="3D preview of your notional satellite. Drag to rotate, scroll to zoom." role="img" />;
}
