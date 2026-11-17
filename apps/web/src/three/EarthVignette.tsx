import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Loadout } from '@ofw/simulation';
import { buildSatellite } from './satelliteModel';
import { webglAvailable } from './webgl';

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const EARTH_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDir;
uniform float hasTex;
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  float d = dot(normalize(vNormalW), normalize(sunDir));
  float dayMix = smoothstep(-0.12, 0.22, d);
  vec3 day = hasTex > 0.5 ? texture2D(dayMap, vUv).rgb : mix(vec3(0.03,0.09,0.2), vec3(0.15,0.3,0.18), step(0.5, fract(vUv.x*7.0+sin(vUv.y*9.0))));
  vec3 night = hasTex > 0.5 ? texture2D(nightMap, vUv).rgb : vec3(0.0);
  night = pow(night, vec3(1.6)) * vec3(1.0, 0.85, 0.6) * 1.4;
  vec3 col = mix(night + day * 0.035, day * (0.35 + 0.85 * max(d, 0.0)), dayMix);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const ATMO_VERT = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vNormalW;
void main() {
  vNormalV = normalize(normalMatrix * normal);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMO_FRAG = /* glsl */ `
uniform vec3 sunDir;
varying vec3 vNormalV;
varying vec3 vNormalW;
void main() {
  float rim = pow(1.0 - abs(vNormalV.z), 2.6);
  float lit = smoothstep(-0.35, 0.4, dot(vNormalW, normalize(sunDir)));
  gl_FragColor = vec4(vec3(0.3, 0.72, 1.0) * rim * (0.25 + 0.9 * lit), rim * 0.9);
}`;

/**
 * Contained Three.js scene: textured Earth (NASA Blue Marble / Black Marble via GIBS),
 * atmosphere rim, inclined orbit ring and a small notional satellite.
 * mode "deploy" frames the satellite and plays the solar-array deployment.
 */
export function EarthVignette({ mode, loadout, inclinationDeg = 53, reducedMotion }: { mode: 'title' | 'deploy'; loadout: Loadout; inclinationDeg?: number; reducedMotion: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !webglAvailable()) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(mode === 'deploy' ? 30 : 34, 1, 0.01, 100);
    const sunDir = new THREE.Vector3(1, 0.25, 0.6).normalize();

    const loader = new THREE.TextureLoader();
    const uniforms = {
      dayMap: { value: null as THREE.Texture | null },
      nightMap: { value: null as THREE.Texture | null },
      sunDir: { value: sunDir },
      hasTex: { value: 0 },
    };
    let loaded = 0;
    const onTex = (key: 'dayMap' | 'nightMap') => (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      uniforms[key].value = t;
      loaded++;
      if (loaded === 2) uniforms.hasTex.value = 1;
    };
    loader.load('/textures/earth_bluemarble_2048.jpg', onTex('dayMap'));
    loader.load('/textures/earth_blackmarble_2048.jpg', onTex('nightMap'));
    const earthGeo = new THREE.SphereGeometry(1, 96, 64);
    const earthMat = new THREE.ShaderMaterial({ uniforms, vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.rotation.y = -1.9;
    scene.add(earth);
    const atmoGeo = new THREE.SphereGeometry(1.035, 64, 48);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: sunDir } },
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Stars (seeded, static)
    const starGeo = new THREE.BufferGeometry();
    const n = 900;
    const pos = new Float32Array(n * 3);
    let s = 12345;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rr = 30;
      pos[i * 3] = rr * Math.sqrt(1 - u * u) * Math.cos(th);
      pos[i * 3 + 1] = rr * u;
      pos[i * 3 + 2] = rr * Math.sqrt(1 - u * u) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x9fb4cc, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Orbit ring (radius ~ 550 km altitude scaled x2 for legibility), inclined
    const orbitR = 1.17;
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.z = THREE.MathUtils.degToRad(inclinationDeg) * 0.6;
    orbitPlane.rotation.x = 0.35;
    scene.add(orbitPlane);
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineDashedMaterial({ color: 0x3fd0e0, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.75 });
    const ring = new THREE.Line(ringGeo, ringMat);
    ring.computeLineDistances();
    orbitPlane.add(ring);

    const sat = buildSatellite(loadout);
    const satHolder = new THREE.Group();
    sat.group.scale.setScalar(mode === 'deploy' ? 0.05 : 0.035);
    satHolder.add(sat.group);
    orbitPlane.add(satHolder);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3fd0e0 }));
    satHolder.add(marker);
    marker.visible = mode === 'title';
    sat.setDeploy(mode === 'deploy' && !reducedMotion ? 0 : 1);

    scene.add(new THREE.AmbientLight(0x334466, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.copy(sunDir).multiplyScalar(10);
    scene.add(sun);

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
    const satWorld = new THREE.Vector3();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;
      const speed = reducedMotion ? 0.02 : 0.12;
      const a = (mode === 'deploy' ? 0.6 : 0) + t * speed;
      satHolder.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
      satHolder.lookAt(0, 0, 0);
      sat.group.rotation.set(Math.PI / 2, 0, 0);
      earth.rotation.y = -1.9 + t * (reducedMotion ? 0.002 : 0.012);
      sat.tick(t);
      if (mode === 'deploy') {
        const d = reducedMotion ? 1 : Math.min(1, Math.max(0, (t - 0.3) / 1.8));
        sat.setDeploy(d);
        satHolder.getWorldPosition(satWorld);
        const zoomOut = reducedMotion ? 1 : Math.min(1, Math.max(0, (t - 1.6) / 1.4));
        const close = satWorld.clone().add(new THREE.Vector3(0.12, 0.05, 0.22));
        const far = new THREE.Vector3(0.4, 0.9, 3.6);
        camera.position.lerpVectors(close, far, easeInOut(zoomOut));
        camera.lookAt(new THREE.Vector3().lerpVectors(satWorld, new THREE.Vector3(0, 0, 0), easeInOut(zoomOut)));
      } else {
        camera.position.set(0.15, 0.55, 3.35);
        camera.lookAt(-0.35, 0.05, 0);
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      sat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      uniforms.dayMap.value?.dispose();
      uniforms.nightMap.value?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!webglAvailable()) {
    return (
      <div className="earth-fallback" role="img" aria-label="Illustration of Earth with a satellite orbit (WebGL unavailable)">
        <svg viewBox="0 0 400 400">
          <defs>
            <radialGradient id="eg" cx="0.4" cy="0.4">
              <stop offset="0" stopColor="#1e4f7a" />
              <stop offset="1" stopColor="#071a30" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="140" fill="url(#eg)" />
          <ellipse cx="200" cy="200" rx="185" ry="60" fill="none" stroke="#3fd0e0" strokeDasharray="6 5" transform="rotate(-28 200 200)" />
          <circle cx="352" cy="118" r="5" fill="#3fd0e0" />
        </svg>
      </div>
    );
  }
  return <div ref={host} className="earth-vignette" aria-hidden="true" />;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
