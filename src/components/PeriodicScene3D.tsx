import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CATEGORY_META,
  ChemicalElement,
  ELEMENTS,
} from '../data/elements';
import {
  CinematicSceneId,
  computeElementTargetPosition,
  computeResponsiveAtomCameraFraming,
  ExperienceMode,
  FilterCriteria,
  JOURNEY_FEATURED_NUMBERS,
  LayoutMode,
  matchesElementFilter,
} from '../utils/chemistryLogic';
import { AudioPulseState, ElementalAudioEngine } from '../utils/audioEngine';

export interface HoveredElementInfo {
  element: ChemicalElement;
  screenX: number;
  screenY: number;
}

interface PeriodicScene3DProps {
  experienceMode: ExperienceMode;
  cinematicScene: CinematicSceneId;
  selectedElement: ChemicalElement | null;
  focusedNumber: number;
  layoutMode: LayoutMode;
  filterCriteria: FilterCriteria;
  audioReactive: boolean;
  audioEngine: ElementalAudioEngine;
  isMobileSheetExpanded: boolean;
  resetCameraTrigger: number;
  onSelectElement: (element: ChemicalElement | null) => void;
  onHoverElement: (info: HoveredElementInfo | null) => void;
  onAudioPulseUpdate: (state: AudioPulseState) => void;
  onHighlightJourneyElement: (el: ChemicalElement) => void;
}

// Pre-allocated scratch math objects outside the animation loop (Zero GC)
const _tempVec3 = new THREE.Vector3();
const _tempVec3B = new THREE.Vector3();
const _tempMat4 = new THREE.Matrix4();
const _tempQuat = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();
const _tempColor = new THREE.Color();
const _projVec = new THREE.Vector3();

const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

/**
 * Generates a high-DPI procedural CanvasTexture for an element tile.
 */
function createElementTileTexture(
  el: ChemicalElement,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  const meta = CATEGORY_META[el.category];

  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, '#0d1630');
  grad.addColorStop(1, '#060a18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 300);

  ctx.fillStyle = meta.color;
  ctx.fillRect(0, 0, 256, 12);

  ctx.strokeStyle = meta.color + '99';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 14, 240, 278);

  // Atomic number (top-left)
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(String(el.number).padStart(2, '0'), 22, 54);

  // Atomic mass (top-right)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(el.mass.toFixed(el.mass < 10 ? 2 : 1), 234, 52);

  // Chemical symbol (center hero)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 14;
  ctx.font = '700 92px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(el.symbol, 128, 158);
  ctx.shadowBlur = 0;

  // Element name
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(el.name, 128, 204);

  // Mini emission spectrum barcode at bottom
  const barX = 24;
  const barY = 238;
  const barW = 208;
  const barH = 26;
  ctx.fillStyle = '#030611';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, barW, barH);

  for (const line of el.spectralLines) {
    const norm = Math.max(0, Math.min(1, (line.wavelengthNm - 380) / 360));
    const lx = barX + 4 + norm * (barW - 8);
    ctx.fillStyle = line.color;
    ctx.globalAlpha = Math.min(1, line.intensity + 0.25);
    ctx.fillRect(lx - 2, barY + 2, 4, barH - 4);
  }
  ctx.globalAlpha = 1.0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a crisp, compact 3D Sprite texture for orbital shell labels (K, L, M, N, O, P, Q).
 */
function createShellLabelSprite(letter: string, shellIndex: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(5, 10, 25, 0.94)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 104, 40, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${letter} (n=${shellIndex + 1})`, 56, 25);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.54, 0.23, 1);
  sprite.renderOrder = 20;
  return sprite;
}

/**
 * Creates a radial volumetric glow CanvasTexture.
 */
function createRadialGlowTexture(innerHex = 'rgba(56, 189, 248, 0.85)'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, innerHex);
  grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(1, 'rgba(5, 8, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const PeriodicScene3D: React.FC<PeriodicScene3DProps> = ({
  experienceMode,
  cinematicScene,
  selectedElement,
  focusedNumber,
  layoutMode,
  filterCriteria,
  audioReactive,
  audioEngine,
  isMobileSheetExpanded,
  resetCameraTrigger,
  onSelectElement,
  onHoverElement,
  onAudioPulseUpdate,
  onHighlightJourneyElement,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    experienceMode,
    cinematicScene,
    selectedElement,
    focusedNumber,
    layoutMode,
    filterCriteria,
    audioReactive,
    isMobileSheetExpanded,
    onSelectElement,
    onHoverElement,
    onAudioPulseUpdate,
    onHighlightJourneyElement,
  });

  useEffect(() => {
    propsRef.current = {
      experienceMode,
      cinematicScene,
      selectedElement,
      focusedNumber,
      layoutMode,
      filterCriteria,
      audioReactive,
      isMobileSheetExpanded,
      onSelectElement,
      onHoverElement,
      onAudioPulseUpdate,
      onHighlightJourneyElement,
    };
  }, [
    experienceMode,
    cinematicScene,
    selectedElement,
    focusedNumber,
    layoutMode,
    filterCriteria,
    audioReactive,
    isMobileSheetExpanded,
    onSelectElement,
    onHoverElement,
    onAudioPulseUpdate,
    onHighlightJourneyElement,
  ]);

  const cameraTargetGoalRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPosGoalRef = useRef(new THREE.Vector3(0, 1.5, 36));
  const userInteractingRef = useRef(false);

  // Recalculate responsive camera framing when mode, scene, selectedElement, or bottom sheet state changes
  useEffect(() => {
    userInteractingRef.current = false;
    const vw = window.innerWidth || 1440;
    const vh = window.innerHeight || 900;
    const isMobile = vw < 768;

    const isAtomView =
      (experienceMode === 'journey' &&
        (cinematicScene === 'scene3-atom-focus' ||
          cinematicScene === 'scene4-science-reveal')) ||
      (experienceMode === 'explore' && selectedElement !== null);

    const isSpectralFinale =
      experienceMode === 'journey' && cinematicScene === 'scene5-spectral-finale';

    if (isAtomView) {
      const hasPanel =
        (experienceMode === 'journey' && cinematicScene === 'scene4-science-reveal') ||
        (experienceMode === 'explore' && selectedElement !== null);
      const framing = computeResponsiveAtomCameraFraming(
        vw,
        vh,
        hasPanel,
        isMobileSheetExpanded
      );
      cameraPosGoalRef.current.set(framing.camPos.x, framing.camPos.y, framing.camPos.z);
      cameraTargetGoalRef.current.set(
        framing.lookTarget.x,
        framing.lookTarget.y,
        framing.lookTarget.z
      );
      return;
    }

    if (isSpectralFinale) {
      cameraPosGoalRef.current.set(0, 0.5, isMobile ? 16.5 : 13.5);
      cameraTargetGoalRef.current.set(0, isMobile ? -0.6 : 0, 0);
      return;
    }

    if (experienceMode === 'intro') {
      cameraPosGoalRef.current.set(0, 1.2, isMobile ? 38 : 31);
      cameraTargetGoalRef.current.set(0, 0, 0);
      return;
    }

    // Full periodic table / gallery / spectral overview
    const tableDist = isMobile ? 38.5 : 27.5;
    if (layoutMode === 'table') {
      cameraTargetGoalRef.current.set(0, isMobile ? -0.8 : -0.35, 0);
      cameraPosGoalRef.current.set(0, isMobile ? -0.4 : 0.1, tableDist);
    } else if (layoutMode === 'gallery') {
      cameraTargetGoalRef.current.set(0, 0, 0);
      cameraPosGoalRef.current.set(0, 2.0, isMobile ? 34 : 26.5);
    } else {
      cameraTargetGoalRef.current.set(0, 0, 0);
      cameraPosGoalRef.current.set(0, 2.8, isMobile ? 34 : 26.0);
    }
  }, [
    experienceMode,
    cinematicScene,
    selectedElement,
    layoutMode,
    isMobileSheetExpanded,
    resetCameraTrigger,
  ]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const isMobileInit = width < 768;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040711);
    scene.fog = new THREE.FogExp2(0x040711, 0.011);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 180);
    camera.position.set(0, 1.8, 38);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isMobileInit ? 1.5 : 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d1e, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.8);
    keyLight.position.set(14, 22, 18);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -22;
      keyLight.shadow.camera.right = 22;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    rimLight.position.set(-18, -12, -14);
    scene.add(rimLight);

    // OrbitControls with smooth exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.2;
    controls.maxDistance = 52;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;

    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
    });

    // Sparse Starfield & Volumetric Space Dust (adaptive count for mobile)
    const starCount = isMobileInit ? 180 : 360;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 30 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi) - 12;

      const palette = [0x38bdf8, 0xa855f7, 0xf472b6, 0xfde047];
      _tempColor.setHex(palette[i % palette.length]);
      starColors[i * 3] = _tempColor.r;
      starColors[i * 3 + 1] = _tempColor.g;
      starColors[i * 3 + 2] = _tempColor.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Volumetric Background Light Halo
    const radialGlowTex = createRadialGlowTexture();
    const volumetricBackdropMat = new THREE.SpriteMaterial({
      map: radialGlowTex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const volumetricBackdropSprite = new THREE.Sprite(volumetricBackdropMat);
    volumetricBackdropSprite.scale.set(42, 28, 1);
    volumetricBackdropSprite.position.set(0, 0, -6);
    scene.add(volumetricBackdropSprite);

    // =========================================================================
    // GROUP 1: 118 Periodic Table Element Nodes (`periodicTableGroup`)
    // =========================================================================
    const periodicTableGroup = new THREE.Group();
    scene.add(periodicTableGroup);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const frameShape = new THREE.Shape();
    const fw = 0.58;
    const fh = 0.68;
    frameShape.moveTo(-fw, -fh);
    frameShape.lineTo(fw, -fh);
    frameShape.lineTo(fw, fh);
    frameShape.lineTo(-fw, fh);
    frameShape.closePath();

    const bezelGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    bezelGeo.center();

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.82,
      roughness: 0.22,
      transparent: true,
      opacity: 1,
    });
    const bezelInstanced = new THREE.InstancedMesh(bezelGeo, bezelMat, 118);
    bezelInstanced.frustumCulled = false;
    periodicTableGroup.add(bezelInstanced);

    const coreBackingGeo = new THREE.BoxGeometry(1.26, 1.46, 0.08);
    const coreBackingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.65,
      transparent: true,
      opacity: 1,
    });
    const coreBackingInstanced = new THREE.InstancedMesh(
      coreBackingGeo,
      coreBackingMat,
      118
    );
    coreBackingInstanced.frustumCulled = false;
    periodicTableGroup.add(coreBackingInstanced);

    const tileFaceGeo = new THREE.PlaneGeometry(1.12, 1.32);
    const interactableMeshes: THREE.Mesh[] = [];
    const tileMaterials: THREE.MeshStandardMaterial[] = [];
    const tileTextures: THREE.CanvasTexture[] = [];

    const currentPositions = ELEMENTS.map((el) => {
      const p = computeElementTargetPosition(el, 'table');
      return new THREE.Vector3(p.x, p.y, p.z);
    });
    const currentScales = new Float32Array(118).fill(1);

    ELEMENTS.forEach((el, idx) => {
      const meta = CATEGORY_META[el.category];
      _tempColor.setHex(meta.accentHex);
      bezelInstanced.setColorAt(idx, _tempColor);
      coreBackingInstanced.setColorAt(idx, _tempColor);

      const tex = createElementTileTexture(el, maxAnisotropy);
      tileTextures.push(tex);

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.15,
        emissive: new THREE.Color(meta.accentHex),
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      tileMaterials.push(mat);

      const mesh = new THREE.Mesh(tileFaceGeo, mat);
      mesh.userData = { elementIndex: idx, element: el };
      mesh.position.copy(currentPositions[idx]);
      mesh.position.z += 0.115;
      periodicTableGroup.add(mesh);
      interactableMeshes.push(mesh);
    });

    if (bezelInstanced.instanceColor) bezelInstanced.instanceColor.needsUpdate = true;
    if (coreBackingInstanced.instanceColor)
      coreBackingInstanced.instanceColor.needsUpdate = true;

    const selectionHaloGeo = new THREE.TorusGeometry(0.96, 0.036, 12, 48);
    const selectionHaloMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 1,
    });
    const selectionHaloMesh = new THREE.Mesh(selectionHaloGeo, selectionHaloMat);
    periodicTableGroup.add(selectionHaloMesh);

    // =========================================================================
    // GROUP 2: Giant Clear 3D Atom Hero Model (`atomHeroGroup`)
    // Occupies 60-70% of viewport with zero periodic-table cards obstructing it
    // =========================================================================
    const atomHeroGroup = new THREE.Group();
    atomHeroGroup.visible = false;
    scene.add(atomHeroGroup);

    // Volumetric central nucleus glow halo
    const nucleusGlowTex = createRadialGlowTexture('rgba(255, 107, 139, 0.9)');
    const nucleusGlowMat = new THREE.SpriteMaterial({
      map: nucleusGlowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const nucleusGlowSprite = new THREE.Sprite(nucleusGlowMat);
    nucleusGlowSprite.scale.set(2.4, 2.4, 1);
    atomHeroGroup.add(nucleusGlowSprite);

    // Subtle volumetric space glow beneath the floating atom
    const contactShadowGeo = new THREE.CircleGeometry(2.6, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.set(0, -3.9, 0);
    atomHeroGroup.add(contactShadowMesh);

    // Bright High-Contrast Nucleus Cluster (Protons in warm coral-gold, Neutrons in electric cyan)
    const maxNucleons = 64;
    const nucleonGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const protonMat = new THREE.MeshStandardMaterial({
      color: 0xff4d6d,
      emissive: 0xff2a55,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.6,
    });
    const neutronMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0.3,
    });
    const protonInstanced = new THREE.InstancedMesh(nucleonGeo, protonMat, maxNucleons);
    const neutronInstanced = new THREE.InstancedMesh(nucleonGeo, neutronMat, maxNucleons);
    protonInstanced.frustumCulled = false;
    neutronInstanced.frustumCulled = false;

    const nucleusGroup = new THREE.Group();
    nucleusGroup.add(protonInstanced);
    nucleusGroup.add(neutronInstanced);
    atomHeroGroup.add(nucleusGroup);

    // 1-7 Clearly Separated Electron Orbital Rings + K, L, M, N, O, P, Q Shell Labels
    const orbitalRings: THREE.Mesh[] = [];
    const shellLabels: THREE.Sprite[] = [];
    const shellTilts: THREE.Euler[] = [];
    const shellRadii: number[] = [];

    for (let s = 0; s < 7; s++) {
      const radius = 0.95 + s * 0.42;
      shellRadii.push(radius);

      // Vary brightness across shells so adjacent layers are unmistakably distinct
      const tubeRadius = s % 2 === 0 ? 0.022 : 0.016;
      const ringGeo = new THREE.TorusGeometry(radius, tubeRadius, 12, 84);
      const ringColor = s % 2 === 0 ? 0x38bdf8 : 0xa855f7;
      const ringMat = new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: s % 2 === 0 ? 0.75 : 0.48,
        transparent: true,
        opacity: s % 2 === 0 ? 0.82 : 0.58,
        roughness: 0.25,
        metalness: 0.5,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);

      // Clean elliptical 3D depth separation tilts
      const tilt = new THREE.Euler(
        0.18 * (s % 2 === 0 ? 1 : -1),
        0.18 * ((s % 3) - 1),
        s * 0.22
      );
      ringMesh.rotation.copy(tilt);
      shellTilts.push(tilt);
      orbitalRings.push(ringMesh);
      atomHeroGroup.add(ringMesh);

      // Place K, L, M, N, O, P, Q shell labels at well-separated clock angles around the ring
      // so they NEVER overlap each other in 2D projection!
      const labelSprite = createShellLabelSprite(SHELL_LETTERS[s], s);
      const labelAngle = Math.PI * 0.78 - s * 0.42;
      _tempVec3.set(
        Math.cos(labelAngle) * radius,
        Math.sin(labelAngle) * radius,
        0
      );
      _tempQuat.setFromEuler(tilt);
      _tempVec3.applyQuaternion(_tempQuat);
      labelSprite.position.copy(_tempVec3);
      shellLabels.push(labelSprite);
      atomHeroGroup.add(labelSprite);
    }

    // Distinct Luminous Electron Spheres (High-contrast warm yellow-white spheres, NOT thin dots)
    const electronGeo = new THREE.SphereGeometry(0.095, 14, 14);
    const electronMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 1.35,
      roughness: 0.1,
      metalness: 0.15,
    });
    const electronInstanced = new THREE.InstancedMesh(electronGeo, electronMat, 118);
    electronInstanced.frustumCulled = false;
    atomHeroGroup.add(electronInstanced);

    // Subtle Electron Motion Trails (2 trailing spheres per electron along elliptical path)
    const trailSteps = 2;
    const trailGeo = new THREE.SphereGeometry(0.058, 10, 10);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const trailInstanced = new THREE.InstancedMesh(
      trailGeo,
      trailMat,
      118 * trailSteps
    );
    trailInstanced.frustumCulled = false;
    atomHeroGroup.add(trailInstanced);

    // =========================================================================
    // GROUP 3: Scene 5 Spectral Finale 3D Stage (`spectralFinaleGroup`)
    // =========================================================================
    const spectralFinaleGroup = new THREE.Group();
    spectralFinaleGroup.visible = false;
    scene.add(spectralFinaleGroup);

    const maxSpectralBeams = 10;
    const beamMeshes: THREE.Mesh[] = [];
    const beamGlowSprites: THREE.Sprite[] = [];
    const beamGeo = new THREE.CylinderGeometry(0.09, 0.09, 7.5, 16);
    for (let b = 0; b < maxSpectralBeams; b++) {
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.3,
      });
      const bMesh = new THREE.Mesh(beamGeo, bMat);
      spectralFinaleGroup.add(bMesh);
      beamMeshes.push(bMesh);

      const sMat = new THREE.SpriteMaterial({
        map: radialGlowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const sSprite = new THREE.Sprite(sMat);
      sSprite.scale.set(1.8, 8.2, 1);
      spectralFinaleGroup.add(sSprite);
      beamGlowSprites.push(sSprite);
    }

    let builtAtomNumber = -1;
    function rebuildAtomAndSpectrumForElement(el: ChemicalElement) {
      if (builtAtomNumber === el.number) return;
      builtAtomNumber = el.number;

      // Maintain high-contrast warm coral-gold protons vs cool cyan neutrons
      protonMat.color.setHex(0xff5c77);
      protonMat.emissive.setHex(0xff2a55);
      neutronMat.color.setHex(0x38bdf8);
      neutronMat.emissive.setHex(0x0284c7);

      const pCount = Math.min(maxNucleons, Math.max(2, Math.ceil(el.number * 0.5)));
      const nCount = Math.min(maxNucleons, Math.max(1, Math.floor(el.number * 0.55)));
      protonInstanced.count = pCount;
      neutronInstanced.count = nCount;

      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < pCount; i++) {
        const r = pCount === 1 ? 0 : 0.14 + Math.cbrt(i / pCount) * 0.34;
        const y = pCount === 1 ? 0 : 1 - (i / Math.max(1, pCount - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i * 2.1;
        _tempVec3.set(Math.cos(theta) * rad * r, y * r, Math.sin(theta) * rad * r);
        _tempMat4.makeTranslation(_tempVec3.x, _tempVec3.y, _tempVec3.z);
        protonInstanced.setMatrixAt(i, _tempMat4);
      }
      protonInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < nCount; i++) {
        const r = 0.14 + Math.cbrt(i / Math.max(1, nCount)) * 0.34;
        const y = nCount <= 1 ? 0 : 1 - (i / Math.max(1, nCount - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * (i + 17) * 2.1;
        _tempVec3.set(Math.cos(theta) * rad * r, y * r, Math.sin(theta) * rad * r);
        _tempMat4.makeTranslation(_tempVec3.x, _tempVec3.y, _tempVec3.z);
        neutronInstanced.setMatrixAt(i, _tempMat4);
      }
      neutronInstanced.instanceMatrix.needsUpdate = true;

      orbitalRings.forEach((ring, sIdx) => {
        const isActive = sIdx < el.shells.length;
        ring.visible = isActive;
        shellLabels[sIdx].visible = isActive;
      });

      electronInstanced.count = el.number;
      trailInstanced.count = el.number * trailSteps;

      // Update Spectral Finale 3D Vertical Beams
      beamMeshes.forEach((bMesh, idx) => {
        const line = el.spectralLines[idx];
        const glow = beamGlowSprites[idx];
        if (!line) {
          bMesh.visible = false;
          glow.visible = false;
          return;
        }
        bMesh.visible = true;
        glow.visible = true;
        const normX = ((line.wavelengthNm - 380) / 370 - 0.5) * 11.5;
        bMesh.position.set(normX, 0, 0);
        glow.position.set(normX, 0, -0.1);
        const mat = bMesh.material as THREE.MeshStandardMaterial;
        mat.color.set(line.color);
        mat.emissive.set(line.color);
        glow.material.color.set(line.color);
      });
    }

    // Raycasting (Hover & Tap/Click)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(-999, -999);
    let hoveredIndex: number | null = null;
    let lastRaycastMs = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 45) return;
      lastRaycastMs = now;

      if (!periodicTableGroup.visible) {
        if (hoveredIndex !== null) {
          hoveredIndex = null;
          propsRef.current.onHoverElement(null);
        }
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactableMeshes, false);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const idx = hitMesh.userData.elementIndex as number;
        const el = ELEMENTS[idx];
        hoveredIndex = idx;
        renderer.domElement.style.cursor = 'pointer';

        _projVec.copy(hitMesh.position).project(camera);
        const sx = ((_projVec.x + 1) / 2) * rect.width + rect.left;
        const sy = ((-_projVec.y + 1) / 2) * rect.height + rect.top;
        propsRef.current.onHoverElement({ element: el, screenX: sx, screenY: sy });
      } else if (hoveredIndex !== null) {
        hoveredIndex = null;
        renderer.domElement.style.cursor = 'grab';
        propsRef.current.onHoverElement(null);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (dist > 8) return;

      if (!periodicTableGroup.visible) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactableMeshes, false);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const el = hitMesh.userData.element as ChemicalElement;
        propsRef.current.onSelectElement(el);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      userInteractingRef.current = false;
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation & Software-WebGL Paced Render Loop
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let lastHudSyncMs = 0;
    let lastFlythroughHighlightNum = -1;

    function tick() {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const nowMs = performance.now();

      const {
        experienceMode: expMode,
        cinematicScene: cScene,
        selectedElement: activeSelected,
        focusedNumber: activeFocused,
        layoutMode: activeLayout,
        filterCriteria: activeFilter,
        audioReactive: isAudioReactive,
        isMobileSheetExpanded: mobileSheetOpen,
      } = propsRef.current;

      const pulseState = audioEngine.update(nowMs, delta);
      if (nowMs - lastHudSyncMs > 95) {
        lastHudSyncMs = nowMs;
        propsRef.current.onAudioPulseUpdate(pulseState);
      }

      const audioBoost = isAudioReactive ? pulseState.beatPulse : 0;
      const smoothFactor = 1 - Math.exp(-6.5 * delta);

      const isAtomStageActive =
        (expMode === 'journey' &&
          (cScene === 'scene3-atom-focus' || cScene === 'scene4-science-reveal')) ||
        (expMode === 'explore' && activeSelected !== null);

      const isSpectralFinaleActive =
        expMode === 'journey' && cScene === 'scene5-spectral-finale';

      // Dynamically keep camera goal synced with live viewport dimensions in Atom/Spectral stages
      const vw = container.clientWidth || window.innerWidth;
      const vh = container.clientHeight || window.innerHeight;
      if (isAtomStageActive) {
        const hasPanel =
          (expMode === 'journey' && cScene === 'scene4-science-reveal') ||
          (expMode === 'explore' && activeSelected !== null);
        const framing = computeResponsiveAtomCameraFraming(
          vw,
          vh,
          hasPanel,
          mobileSheetOpen
        );
        cameraPosGoalRef.current.set(framing.camPos.x, framing.camPos.y, framing.camPos.z);
        cameraTargetGoalRef.current.set(
          framing.lookTarget.x,
          framing.lookTarget.y,
          framing.lookTarget.z
        );
      } else if (isSpectralFinaleActive) {
        const isMob = vw < 768;
        cameraPosGoalRef.current.set(0, 0.5, isMob ? 18.5 : 14.0);
        cameraTargetGoalRef.current.set(0, isMob ? -0.5 : 0, 0);
      }

      const heroElement =
        activeSelected ??
        ELEMENTS[(activeFocused || 79) - 1] ??
        ELEMENTS[78];

      // 1. Camera Choreography per Scene / Mode
      if (!userInteractingRef.current) {
        if (expMode === 'intro') {
          const dollyZ = 34 - Math.min(5.0, elapsed * 0.45);
          _tempVec3.set(
            Math.sin(elapsed * 0.18) * 3.0,
            1.4 + Math.cos(elapsed * 0.15) * 0.5,
            vw < 768 ? dollyZ + 7 : dollyZ
          );
          camera.position.lerp(_tempVec3, smoothFactor);
          controls.target.lerp(_tempVec3B.set(0, -0.3, 0), smoothFactor);
        } else if (expMode === 'journey' && cScene === 'scene2-flythrough') {
          const seqIdx =
            Math.floor(elapsed * 0.65) % JOURNEY_FEATURED_NUMBERS.length;
          const highlightedNum = JOURNEY_FEATURED_NUMBERS[seqIdx];
          const highlightedEl = ELEMENTS[highlightedNum - 1];
          if (highlightedNum !== lastFlythroughHighlightNum) {
            lastFlythroughHighlightNum = highlightedNum;
            propsRef.current.onHighlightJourneyElement(highlightedEl);
          }
          const elPos = computeElementTargetPosition(highlightedEl, 'table');
          const isMob = vw < 768;
          _tempVec3.set(
            elPos.x * 0.55,
            elPos.y * 0.55 + 0.4,
            isMob ? 22.5 : 16.0
          );
          camera.position.lerp(_tempVec3, smoothFactor * 0.7);
          controls.target.lerp(
            _tempVec3B.set(elPos.x * 0.75, elPos.y * 0.75, elPos.z),
            smoothFactor * 0.7
          );
        } else {
          camera.position.lerp(cameraPosGoalRef.current, smoothFactor);
          controls.target.lerp(cameraTargetGoalRef.current, smoothFactor);
        }
      }

      starPoints.rotation.y = elapsed * 0.014;
      volumetricBackdropMat.opacity = 0.2 + audioBoost * 0.12;

      // 2. Hide Periodic Table completely when inspecting a single Atom or Spectral Finale
      periodicTableGroup.visible = !isAtomStageActive && !isSpectralFinaleActive;

      if (periodicTableGroup.visible) {
        periodicTableGroup.rotation.y =
          expMode === 'intro' ? Math.sin(elapsed * 0.22) * 0.14 : 0;

        for (let i = 0; i < 118; i++) {
          const el = ELEMENTS[i];
          const target = computeElementTargetPosition(el, activeLayout);
          const matches = matchesElementFilter(el, activeFilter);
          const isHovered = hoveredIndex === i;
          const isFocused = activeFocused === el.number;

          const floatY = Math.sin(elapsed * 1.4 + el.number * 0.35) * 0.045;
          const floatZ =
            (isFocused ? 0.65 : isHovered ? 0.38 : 0) + (matches ? 0 : -1.4);

          _tempVec3.set(target.x, target.y + floatY, target.z + floatZ);
          currentPositions[i].lerp(_tempVec3, smoothFactor);

          const goalScale = isFocused
            ? 1.24 + audioBoost * 0.1
            : isHovered
            ? 1.14
            : matches
            ? 1.0 + (isAudioReactive ? audioBoost * 0.04 : 0)
            : 0.68;

          currentScales[i] += (goalScale - currentScales[i]) * smoothFactor;
          const s = currentScales[i];

          const tileMesh = interactableMeshes[i];
          tileMesh.position.copy(currentPositions[i]);
          tileMesh.position.z += 0.115 * s;
          tileMesh.scale.setScalar(s);

          if (activeLayout === 'gallery') {
            tileMesh.lookAt(camera.position);
            _tempQuat.copy(tileMesh.quaternion);
          } else {
            _tempEuler.set(0, Math.sin(elapsed * 0.6 + i * 0.2) * 0.03, 0);
            _tempQuat.setFromEuler(_tempEuler);
            tileMesh.quaternion.copy(_tempQuat);
          }

          _tempScale.set(s, s, s);
          _tempMat4.compose(currentPositions[i], _tempQuat, _tempScale);
          bezelInstanced.setMatrixAt(i, _tempMat4);

          _tempVec3B.copy(currentPositions[i]);
          _tempVec3B.z -= 0.05 * s;
          _tempMat4.compose(_tempVec3B, _tempQuat, _tempScale);
          coreBackingInstanced.setMatrixAt(i, _tempMat4);

          const mat = tileMaterials[i];
          if (!matches) {
            mat.emissiveIntensity = 0.01;
            mat.color.setHex(0x334155);
          } else if (expMode === 'intro') {
            mat.color.setHex(0x94a3b8);
            mat.emissiveIntensity = 0.04;
          } else {
            mat.color.setHex(0xffffff);
            mat.emissiveIntensity =
              (isFocused ? 0.45 : isHovered ? 0.3 : 0.08) + audioBoost * 0.22;
          }
        }

        bezelInstanced.instanceMatrix.needsUpdate = true;
        coreBackingInstanced.instanceMatrix.needsUpdate = true;

        const haloIdx = Math.max(0, Math.min(117, activeFocused - 1));
        const haloEl = ELEMENTS[haloIdx];
        selectionHaloMesh.position.copy(currentPositions[haloIdx]);
        selectionHaloMesh.quaternion.copy(interactableMeshes[haloIdx].quaternion);
        selectionHaloMesh.rotation.z = elapsed * 1.2;
        selectionHaloMesh.scale.setScalar(
          currentScales[haloIdx] * (1.05 + audioBoost * 0.1)
        );
        selectionHaloMat.color.setHex(CATEGORY_META[haloEl.category].accentHex);
        selectionHaloMat.emissive.setHex(CATEGORY_META[haloEl.category].accentHex);
      }

      // 3. Giant 3D Atom Hero Visualization (Scenes 3 & 4 + Explore Mode Element Inspection)
      if (isAtomStageActive && heroElement) {
        rebuildAtomAndSpectrumForElement(heroElement);
        atomHeroGroup.visible = true;

        // Scale the atom dynamically based on its shell count so even 1-3 shell atoms fill 60-70% of viewport
        const maxShellRadius =
          0.95 + Math.max(0, heroElement.shells.length - 1) * 0.42;
        const normalizedAtomScale = 2.95 / Math.max(1.25, maxShellRadius);
        atomHeroGroup.scale.setScalar(normalizedAtomScale);

        nucleusGroup.rotation.y = elapsed * 0.65;
        nucleusGroup.rotation.x = elapsed * 0.35;
        nucleusGroup.scale.setScalar(1 + audioBoost * 0.12);
        nucleusGlowSprite.scale.setScalar(2.2 + audioBoost * 0.35);

        let eCursor = 0;
        let tCursor = 0;
        const shells = heroElement.shells;

        for (let sIdx = 0; sIdx < shells.length; sIdx++) {
          const countInShell = shells[sIdx];
          const radius = shellRadii[sIdx];
          // Calm, physically readable orbital angular velocity
          const speed = (1.35 - sIdx * 0.13) * (1 + audioBoost * 0.2);
          const tilt = shellTilts[sIdx];
          _tempQuat.setFromEuler(tilt);

          for (let k = 0; k < countInShell; k++) {
            if (eCursor >= 118) break;
            const baseAngle = (k / countInShell) * Math.PI * 2 + elapsed * speed;

            // Primary electron sphere
            _tempVec3.set(
              Math.cos(baseAngle) * radius,
              Math.sin(baseAngle) * radius * 0.96,
              0
            );
            _tempVec3.applyQuaternion(_tempQuat);
            _tempScale.setScalar(1 + audioBoost * 0.18);
            _tempMat4.compose(_tempVec3, _tempQuat, _tempScale);
            electronInstanced.setMatrixAt(eCursor, _tempMat4);
            eCursor++;

            // Motion trail spheres lagging slightly behind along the elliptical orbit
            for (let step = 1; step <= trailSteps; step++) {
              const trailAngle = baseAngle - step * 0.085;
              _tempVec3.set(
                Math.cos(trailAngle) * radius,
                Math.sin(trailAngle) * radius * 0.96,
                0
              );
              _tempVec3.applyQuaternion(_tempQuat);
              _tempScale.setScalar(1 - step * 0.28);
              _tempMat4.compose(_tempVec3, _tempQuat, _tempScale);
              trailInstanced.setMatrixAt(tCursor, _tempMat4);
              tCursor++;
            }
          }
        }
        electronInstanced.instanceMatrix.needsUpdate = true;
        trailInstanced.instanceMatrix.needsUpdate = true;
      } else {
        atomHeroGroup.visible = false;
      }

      // 4. Scene 5 — 3D Spectral Finale Stage
      if (isSpectralFinaleActive && heroElement) {
        rebuildAtomAndSpectrumForElement(heroElement);
        spectralFinaleGroup.visible = true;
        spectralFinaleGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.18;

        beamMeshes.forEach((bMesh, idx) => {
          const line = heroElement.spectralLines[idx];
          if (!line) return;
          const pulse =
            line.intensity *
            (0.85 + Math.sin(elapsed * 3.2 + idx) * 0.15 + audioBoost * 0.35);
          bMesh.scale.set(1 + audioBoost * 0.25, Math.max(0.3, pulse), 1);
          const glow = beamGlowSprites[idx];
          glow.scale.set(1.8 + audioBoost * 0.6, 8.2 * Math.max(0.4, pulse), 1);
        });
      } else {
        spectralFinaleGroup.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();

      bezelGeo.dispose();
      bezelMat.dispose();
      coreBackingGeo.dispose();
      coreBackingMat.dispose();
      tileFaceGeo.dispose();
      tileMaterials.forEach((m) => m.dispose());
      tileTextures.forEach((t) => t.dispose());
      radialGlowTex.dispose();
      nucleusGlowTex.dispose();
      starGeo.dispose();
      starMat.dispose();
      selectionHaloGeo.dispose();
      selectionHaloMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      nucleonGeo.dispose();
      protonMat.dispose();
      neutronMat.dispose();
      electronGeo.dispose();
      electronMat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      beamGeo.dispose();
      renderer.dispose();
    };
  }, [audioEngine]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="periodic-canvas-container"
      className="fixed inset-0 w-screen h-screen overflow-hidden z-0"
      aria-label="Interactive 3D Periodic Table and Atomic Orbital Viewport"
    />
  );
};
