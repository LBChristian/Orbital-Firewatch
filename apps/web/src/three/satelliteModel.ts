import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Loadout } from '@ofw/simulation';

/**
 * Procedural notional Earth-observation smallsat. A fictional player spacecraft, not a model of
 * any real NASA satellite. Units: metres. Nadir (Earth-facing) is -Y; solar wings extend along ±X.
 */

export interface SatelliteRig {
  group: THREE.Group;
  /** 0 = stowed, 1 = fully deployed. */
  setDeploy(t: number): void;
  /** Per-frame animation (status lights, gimbal), seconds. */
  tick(time: number): void;
  dispose(): void;
}

let foilTex: THREE.CanvasTexture | null = null;
let cellTex: THREE.CanvasTexture | null = null;
let radiatorTex: THREE.CanvasTexture | null = null;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Crinkled gold multi-layer insulation, procedural. */
function foilTexture(): THREE.CanvasTexture {
  if (foilTex) return foilTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b8913f';
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 260; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const w = 10 + r() * 40;
    const h = 4 + r() * 18;
    const a = r() * Math.PI;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const light = r() > 0.5;
    g.fillStyle = light ? `rgba(255,236,170,${0.08 + r() * 0.18})` : `rgba(80,52,12,${0.08 + r() * 0.2})`;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  foilTex = new THREE.CanvasTexture(c);
  foilTex.colorSpace = THREE.SRGBColorSpace;
  foilTex.wrapS = foilTex.wrapT = THREE.RepeatWrapping;
  return foilTex;
}

/** Solar cell grid: dark blue cells with silver interconnects. */
function cellTexture(): THREE.CanvasTexture {
  if (cellTex) return cellTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9ced6';
  g.fillRect(0, 0, 256, 256);
  const cols = 6;
  const rows = 8;
  const pad = 3;
  const cw = 256 / cols;
  const ch = 256 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const grd = g.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch);
      grd.addColorStop(0, '#152a5c');
      grd.addColorStop(1, '#0a1634');
      g.fillStyle = grd;
      g.fillRect(i * cw + pad, j * ch + pad, cw - pad * 2, ch - pad * 2);
      g.strokeStyle = 'rgba(160,180,220,0.25)';
      g.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.moveTo(i * cw + pad, j * ch + (k * ch) / 4);
        g.lineTo((i + 1) * cw - pad, j * ch + (k * ch) / 4);
        g.stroke();
      }
    }
  }
  cellTex = new THREE.CanvasTexture(c);
  cellTex.colorSpace = THREE.SRGBColorSpace;
  cellTex.anisotropy = 4;
  return cellTex;
}

/** White radiator panel with fine slats. */
function radiatorTexture(): THREE.CanvasTexture {
  if (radiatorTex) return radiatorTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#dfe4ea';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(90,100,115,0.45)';
  for (let y = 6; y < 128; y += 8) {
    g.beginPath();
    g.moveTo(4, y);
    g.lineTo(124, y);
    g.stroke();
  }
  radiatorTex = new THREE.CanvasTexture(c);
  radiatorTex.colorSpace = THREE.SRGBColorSpace;
  return radiatorTex;
}

export function buildSatellite(loadout: Loadout): SatelliteRig {
  const group = new THREE.Group();
  group.name = 'notional-smallsat';
  const disposables: { dispose(): void }[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T) => (disposables.push(g), g);
  const mat = <T extends THREE.Material>(m: T) => (disposables.push(m), m);

  const medium = loadout.busId === 'bus-medium';
  const W = medium ? 0.9 : 0.66;
  const H = medium ? 1.15 : 0.86;
  const D = medium ? 0.9 : 0.66;

  const foil = mat(new THREE.MeshStandardMaterial({ map: foilTexture(), metalness: 0.85, roughness: 0.38, color: 0xffffff }));
  const frame = mat(new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.32 }));
  const darkMetal = mat(new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.45 }));
  const white = mat(new THREE.MeshStandardMaterial({ map: radiatorTexture(), metalness: 0.05, roughness: 0.7 }));
  const lens = mat(new THREE.MeshPhysicalMaterial({ color: 0x050a12, metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const cells = mat(new THREE.MeshStandardMaterial({ map: cellTexture(), metalness: 0.35, roughness: 0.32 }));
  const cellBack = mat(new THREE.MeshStandardMaterial({ color: 0x6c7480, metalness: 0.5, roughness: 0.55 }));

  // --- Bus
  const bus = new THREE.Mesh(geo(new RoundedBoxGeometry(W, H, D, 3, 0.04)), foil);
  group.add(bus);
  // Frame rails along vertical edges
  const railGeo = geo(new THREE.BoxGeometry(0.035, H + 0.02, 0.035));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const r = new THREE.Mesh(railGeo, frame);
      r.position.set((sx * W) / 2, 0, (sz * D) / 2);
      group.add(r);
    }
  // Top & bottom deck plates
  const deckGeo = geo(new THREE.BoxGeometry(W + 0.03, 0.03, D + 0.03));
  for (const sy of [-1, 1]) {
    const p = new THREE.Mesh(deckGeo, frame);
    p.position.y = (sy * H) / 2;
    group.add(p);
  }
  // Radiator panels on ±Z faces
  const radGeo = geo(new THREE.PlaneGeometry(W * 0.78, H * 0.62));
  for (const sz of [-1, 1]) {
    const rad = new THREE.Mesh(radGeo, white);
    rad.position.set(0, H * 0.06, (sz * D) / 2 + 0.006);
    if (sz < 0) rad.rotation.y = Math.PI;
    group.add(rad);
  }
  // Equipment access panels (generic, unlabelled)
  const panelGeo = geo(new THREE.BoxGeometry(W * 0.32, H * 0.16, 0.012));
  for (const [x, y] of [
    [-W * 0.2, -H * 0.36],
    [W * 0.2, -H * 0.36],
  ]) {
    const p = new THREE.Mesh(panelGeo, darkMetal);
    p.position.set(x, y, D / 2 + 0.008);
    group.add(p);
  }

  // Status lights
  const lights: THREE.Mesh[] = [];
  const lightGeo = geo(new THREE.SphereGeometry(0.014, 10, 8));
  const lightMats = [0x3fd0e0, 0x5cd69c, 0xf2a93b].map((c) => mat(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2 })));
  lightMats.forEach((m, i) => {
    const l = new THREE.Mesh(lightGeo, m);
    l.position.set(-W * 0.3 + i * 0.05, -H * 0.36 + 0.06, D / 2 + 0.02);
    group.add(l);
    lights.push(l);
  });

  // --- Payload (nadir, -Y)
  const payload = new THREE.Group();
  payload.position.y = -H / 2;
  group.add(payload);
  const addBaffle = (radius: number, length: number, x: number, z: number, tiltX = 0, tiltZ = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.set(tiltX, 0, tiltZ);
    const tube = new THREE.Mesh(geo(new THREE.CylinderGeometry(radius * 1.12, radius, length, 28, 1, true)), darkMetal);
    tube.position.y = -length / 2;
    tube.material.side = THREE.DoubleSide;
    g.add(tube);
    const collar = new THREE.Mesh(geo(new THREE.TorusGeometry(radius * 1.12, 0.012, 8, 28)), frame);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -length;
    g.add(collar);
    const glass = new THREE.Mesh(geo(new THREE.CircleGeometry(radius * 0.92, 28)), lens);
    glass.rotation.x = Math.PI / 2;
    glass.position.y = -length * 0.35;
    g.add(glass);
    payload.add(g);
    return g;
  };
  if (loadout.payloadId === 'payload-wide') {
    // Fan of three wide-field cameras
    addBaffle(0.07, 0.12, -0.16, 0, 0, -0.32);
    addBaffle(0.07, 0.12, 0, 0);
    addBaffle(0.07, 0.12, 0.16, 0, 0, 0.32);
  } else if (loadout.payloadId === 'payload-high') {
    // Long telescope with an angled sunshade
    const t = addBaffle(0.15, 0.42, 0, 0);
    const shade = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.175, 0.175, 0.16, 28, 1, true, 0, Math.PI)), foil);
    shade.position.y = -0.48;
    shade.material.side = THREE.DoubleSide;
    t.add(shade);
  } else {
    addBaffle(0.11, 0.22, 0, 0);
  }
  // Precision pointing: gimbal yoke around the payload
  let gimbal: THREE.Group | null = null;
  if (loadout.pointingId === 'pointing-precision') {
    gimbal = new THREE.Group();
    const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.22, 0.016, 10, 40)), frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.1;
    gimbal.add(ring);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.14, 0.03)), frame);
      arm.position.set(s * 0.22, -0.04, 0);
      gimbal.add(arm);
    }
    payload.add(gimbal);
    // Reaction wheel housings on top deck
    const rwGeo = geo(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 20));
    for (const [x, z] of [
      [-W * 0.25, -D * 0.25],
      [W * 0.25, -D * 0.25],
      [-W * 0.25, D * 0.25],
      [W * 0.25, D * 0.25],
    ]) {
      const rw = new THREE.Mesh(rwGeo, darkMetal);
      rw.position.set(x, H / 2 + 0.035, z);
      group.add(rw);
    }
  }

  // --- Star trackers (top, angled)
  const stGeo = geo(new THREE.CylinderGeometry(0.035, 0.05, 0.11, 16));
  for (const s of [-1, 1]) {
    const st = new THREE.Mesh(stGeo, darkMetal);
    st.position.set(s * W * 0.18, H / 2 + 0.07, -D * 0.05);
    st.rotation.z = s * 0.45;
    st.rotation.x = -0.25;
    group.add(st);
  }

  // --- Low-gain antenna stubs
  const lgaGeo = geo(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6));
  for (const [x, z] of [
    [W / 2, D / 2],
    [-W / 2, -D / 2],
  ]) {
    const a = new THREE.Mesh(lgaGeo, frame);
    a.position.set(x, H / 2 + 0.11, z);
    group.add(a);
  }

  // --- Communications
  const comms = new THREE.Group();
  group.add(comms);
  if (loadout.commsId === 'comms-high') {
    // Parabolic high-gain dish on a boom, Earth-facing side
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const r = (i / 16) * 0.26;
      pts.push(new THREE.Vector2(r, (r * r) / 0.35));
    }
    const dish = new THREE.Mesh(geo(new THREE.LatheGeometry(pts, 40)), mat(new THREE.MeshStandardMaterial({ color: 0xe8ecf1, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })));
    const boom = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8)), frame);
    boom.position.set(0, -0.16, 0);
    const holder = new THREE.Group();
    holder.position.set(0, -H / 2 + 0.05, -D / 2 - 0.12);
    holder.rotation.x = -0.6;
    dish.position.y = -0.36;
    dish.rotation.x = Math.PI;
    const feed = new THREE.Mesh(geo(new THREE.ConeGeometry(0.025, 0.08, 10)), darkMetal);
    feed.position.y = -0.25;
    holder.add(boom, dish, feed);
    comms.add(holder);
  } else if (loadout.commsId === 'comms-standard') {
    // Flat-panel patch array
    const pa = new THREE.Mesh(geo(new THREE.BoxGeometry(0.22, 0.02, 0.22)), mat(new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.4, roughness: 0.5 })));
    pa.position.set(W * 0.3, -H / 2 - 0.02, -D * 0.28);
    const grid = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.2, 0.2, 4, 4)), mat(new THREE.MeshBasicMaterial({ color: 0x8b6a2a, wireframe: true })));
    grid.rotation.x = Math.PI / 2;
    grid.position.set(W * 0.3, -H / 2 - 0.031, -D * 0.28);
    comms.add(pa, grid);
  } else {
    const patch = new THREE.Mesh(geo(new THREE.BoxGeometry(0.1, 0.015, 0.1)), mat(new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.7, roughness: 0.3 })));
    patch.position.set(W * 0.3, -H / 2 - 0.012, -D * 0.28);
    comms.add(patch);
  }

  // --- Solar wings
  const panelCount = loadout.solarId === 'solar-high' ? 4 : loadout.solarId === 'solar-standard' ? 3 : 2;
  const pw = loadout.solarId === 'solar-compact' ? 0.56 : 0.66;
  const ph = H * 0.82;
  const panelGeo2 = geo(new THREE.BoxGeometry(pw, ph, 0.025));
  const hingeGeo = geo(new THREE.CylinderGeometry(0.014, 0.014, ph * 0.9, 8));
  const yokeGeo = geo(new THREE.BoxGeometry(0.24, 0.025, 0.025));
  type Wing = { root: THREE.Group; panels: THREE.Group[]; side: number };
  const wings: Wing[] = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set((side * W) / 2, 0.02, 0);
    const yoke = new THREE.Mesh(yokeGeo, frame);
    yoke.position.x = side * 0.12;
    root.add(yoke);
    const panels: THREE.Group[] = [];
    let parent: THREE.Object3D = root;
    for (let i = 0; i < panelCount; i++) {
      const hinge = new THREE.Group();
      hinge.position.x = i === 0 ? side * 0.24 : side * pw;
      const p = new THREE.Mesh(panelGeo2, [cellBack, cellBack, cellBack, cellBack, cells, cellBack]);
      p.position.x = (side * pw) / 2;
      const h = new THREE.Mesh(hingeGeo, frame);
      hinge.add(p, h);
      parent.add(hinge);
      panels.push(hinge);
      parent = hinge;
    }
    group.add(root);
    wings.push({ root, panels, side });
  }

  // Battery tier: extra exterior battery module on extended battery
  if (loadout.batteryId === 'battery-extended') {
    const bm = new THREE.Mesh(geo(new RoundedBoxGeometry(W * 0.5, 0.12, D * 0.4, 2, 0.02)), darkMetal);
    bm.position.set(0, H / 2 + 0.07, D * 0.22);
    group.add(bm);
  }
  // Recorder tier: data-handling boxes on the anti-nadir deck
  const recCount = loadout.recorderId === 'recorder-large' ? 3 : loadout.recorderId === 'recorder-medium' ? 2 : 1;
  const recGeo = geo(new THREE.BoxGeometry(0.08, 0.05, 0.12));
  for (let i = 0; i < recCount; i++) {
    const rb = new THREE.Mesh(recGeo, frame);
    rb.position.set(-W * 0.3 + i * 0.1, H / 2 + 0.035, -D * 0.3);
    group.add(rb);
  }

  let deploy = 1;
  const setDeploy = (t: number) => {
    deploy = Math.max(0, Math.min(1, t));
    // Stage 1 (0-0.35): wing swings out from stowed against the bus; stage 2: accordion unfold.
    const swing = Math.min(1, deploy / 0.35);
    const unfold = Math.max(0, (deploy - 0.35) / 0.65);
    for (const w of wings) {
      w.root.rotation.y = w.side * (1 - easeOut(swing)) * (Math.PI / 2) * -1;
      w.panels.forEach((p, i) => {
        if (i === 0) return;
        p.rotation.y = (1 - easeOut(unfold)) * Math.PI * (i % 2 ? 1 : -1) * w.side * 0.98;
      });
    }
  };
  setDeploy(1);

  const tick = (time: number) => {
    lights.forEach((l, i) => {
      const on = Math.sin(time * (1.4 + i * 0.7) + i) > 0.2;
      (l.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.4 : 0.15;
    });
    if (gimbal) gimbal.rotation.y = Math.sin(time * 0.6) * 0.25;
  };

  return {
    group,
    setDeploy,
    tick,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
