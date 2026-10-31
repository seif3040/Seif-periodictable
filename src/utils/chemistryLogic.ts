import {
  ChemicalElement,
  ELEMENTS,
  ElementCategory,
  MatterState,
} from '../data/elements';

export type LayoutMode = 'table' | 'gallery' | 'spectral';

export type ExperienceMode = 'intro' | 'journey' | 'explore';

export type CinematicSceneId =
  | 'scene1-intro'
  | 'scene2-flythrough'
  | 'scene3-atom-focus'
  | 'scene4-science-reveal'
  | 'scene5-spectral-finale';

export const CINEMATIC_SCENES: {
  id: CinematicSceneId;
  stepNumber: number;
  title: string;
  subtitle: string;
  durationSec: number;
}[] = [
  {
    id: 'scene1-intro',
    stepNumber: 1,
    title: 'Enter the Universe',
    subtitle: 'Explore the universe through the 118 elements',
    durationSec: 6,
  },
  {
    id: 'scene2-flythrough',
    stepNumber: 2,
    title: 'Fly Through the Periodic Table',
    subtitle: 'Traversing periods and chemical families across 3D space',
    durationSec: 9,
  },
  {
    id: 'scene3-atom-focus',
    stepNumber: 3,
    title: 'Quantum Atomic Architecture',
    subtitle: 'Nucleus cluster, concentric orbital shells, and luminous electrons',
    durationSec: 7,
  },
  {
    id: 'scene4-science-reveal',
    stepNumber: 4,
    title: 'Unveiling Elemental Science',
    subtitle: 'Atomic mass, shell configuration, and physical constants',
    durationSec: 8,
  },
  {
    id: 'scene5-spectral-finale',
    stepNumber: 5,
    title: 'The Spectral Finale',
    subtitle: 'Characteristic optical emission wavelengths across the cosmos',
    durationSec: 8,
  },
];

// Iconic elements highlighted during the guided Cinematic Journey
export const JOURNEY_FEATURED_NUMBERS = [1, 6, 8, 26, 29, 79, 92];

export interface FilterCriteria {
  query: string;
  category: ElementCategory | 'all';
  state: MatterState | 'all';
}

export interface Vec3Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Checks if an element matches the active search query, category filter, and state filter.
 */
export function matchesElementFilter(
  element: ChemicalElement,
  criteria: FilterCriteria
): boolean {
  if (criteria.category !== 'all' && element.category !== criteria.category) {
    return false;
  }
  if (criteria.state !== 'all' && element.state !== criteria.state) {
    return false;
  }
  const q = criteria.query.trim().toLowerCase();
  if (!q) return true;

  if (/^\d+$/.test(q)) {
    return element.number === Number(q) || String(element.number).startsWith(q);
  }

  return (
    element.name.toLowerCase().includes(q) ||
    element.symbol.toLowerCase().includes(q) ||
    String(element.number) === q ||
    element.category.replace(/-/g, ' ').toLowerCase().includes(q)
  );
}

export function filterElements(
  elements: ChemicalElement[],
  criteria: FilterCriteria
): ChemicalElement[] {
  return elements.filter((el) => matchesElementFilter(el, criteria));
}

/**
 * Computes the 3D target coordinate for an element in one of the 3 visualization modes:
 * 1. 'table' -> Classic 18-column + f-block periodic table in 3D space with generous card spacing
 * 2. 'gallery' -> 3D Atom Gallery (Fibonacci orbital rings grouped by period/shells)
 * 3. 'spectral' -> 3D Spectral Visualization landscape
 */
export function computeElementTargetPosition(
  element: ChemicalElement,
  mode: LayoutMode
): Vec3Position {
  if (mode === 'table') {
    const colSpacing = 1.62;
    const rowSpacing = 1.72;
    const centerCol = 9.5;
    const centerRow = 5.65;
    const x = (element.gridCol - centerCol) * colSpacing;
    const extraRowOffset = element.gridRow >= 9 ? 0.45 : 0;
    const y = (centerRow - element.gridRow - extraRowOffset) * rowSpacing;
    const z = Math.sin(element.gridCol * 0.25) * 0.38 + (element.period - 4) * 0.14;
    return { x, y, z };
  }

  if (mode === 'gallery') {
    const idx = element.number - 1;
    const total = 118;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const yNorm = 1 - (idx / (total - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = goldenAngle * idx;
    const shellRadius = 9.0 + (element.period - 1) * 0.7;
    const x = Math.cos(theta) * radiusAtY * shellRadius * 1.25;
    const y = yNorm * 8.6;
    const z = Math.sin(theta) * radiusAtY * shellRadius;
    return { x, y, z };
  }

  const primaryWavelength = element.spectralLines[0]?.wavelengthNm ?? 500;
  const normWave = (primaryWavelength - 380) / 360;
  const normNum = (element.number - 1) / 117;
  const x = (normNum * 0.65 + normWave * 0.35 - 0.5) * 27;
  const y = ((element.ionizationEnergyEv - 3.8) / 21.0 - 0.42) * 11.8;
  const z = (element.period - 4) * 2.1 + Math.cos(element.number * 0.35) * 0.6;
  return { x, y, z };
}

/**
 * Computes responsive camera position & lookAt target when inspecting a single giant 3D Atom
 * so that:
 * - On Desktop (>= 768px): the atom is shifted left of the 360px right side panel and fills ~65% of the remaining viewport.
 * - On Mobile (< 768px): the atom is shifted upward above the collapsible bottom sheet and fills ~60-70% of the upper viewport.
 */
export function computeResponsiveAtomCameraFraming(
  viewportWidth: number,
  viewportHeight: number,
  isPanelVisible: boolean,
  isMobileSheetExpanded: boolean
): { camPos: Vec3Position; lookTarget: Vec3Position } {
  const isMobile = viewportWidth < 768;
  const aspect = Math.max(0.42, viewportWidth / Math.max(1, viewportHeight));

  if (isMobile) {
    // Calibrated for portrait mobile (320x568 to 430x932) so 100% of the outer orbital ring fits inside the width and below top controls
    const dist = Math.max(11.6, Math.min(16.0, 6.6 / aspect));
    // Shift camera lookTarget.y negative so the atom at (0,0,0) renders in the upper unobstructed viewport above the bottom sheet
    const targetY = !isPanelVisible ? -0.25 : isMobileSheetExpanded ? -2.15 : -0.75;
    return {
      camPos: { x: 0, y: targetY + 0.25, z: dist },
      lookTarget: { x: 0, y: targetY, z: 0 },
    };
  }

  // Desktop: right side panel is 360px wide when visible.
  // Shifting lookTarget.x to +1.55 places the atom at (0,0,0) cleanly centered in the left (1440 - 360)px space
  const targetX = isPanelVisible ? 1.55 : 0;
  const dist = Math.max(8.4, Math.min(10.5, 9.8 / Math.min(1.6, aspect)));
  return {
    camPos: { x: targetX, y: 0.35, z: dist },
    lookTarget: { x: targetX, y: -0.05, z: 0 },
  };
}

/**
 * Steps to the next or previous scene in the 5-scene Cinematic Journey.
 */
export function getNextCinematicScene(
  current: CinematicSceneId,
  direction: 'next' | 'prev'
): CinematicSceneId {
  const idx = CINEMATIC_SCENES.findIndex((s) => s.id === current);
  if (idx === -1) return 'scene2-flythrough';
  if (direction === 'next') {
    const nextIdx = idx + 1;
    // Wrap from scene5 back to scene2 during continuous journey
    return nextIdx < CINEMATIC_SCENES.length
      ? CINEMATIC_SCENES[nextIdx].id
      : 'scene2-flythrough';
  } else {
    const prevIdx = idx - 1;
    return prevIdx >= 1 ? CINEMATIC_SCENES[prevIdx].id : 'scene2-flythrough';
  }
}

/**
 * Keyboard arrow navigation across the periodic table grid.
 */
export function getAdjacentElementNumber(
  currentNumber: number,
  direction: 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown'
): number {
  const current = ELEMENTS.find((e) => e.number === currentNumber) ?? ELEMENTS[0];

  if (direction === 'ArrowRight') {
    return currentNumber < 118 ? currentNumber + 1 : 1;
  }
  if (direction === 'ArrowLeft') {
    return currentNumber > 1 ? currentNumber - 1 : 118;
  }

  const targetRowDelta = direction === 'ArrowDown' ? 1 : -1;
  const sameColCandidates = ELEMENTS.filter((el) => el.gridCol === current.gridCol);
  sameColCandidates.sort((a, b) => a.gridRow - b.gridRow);
  const idx = sameColCandidates.findIndex((el) => el.number === current.number);
  if (idx !== -1) {
    const nextIdx =
      (idx + targetRowDelta + sameColCandidates.length) % sameColCandidates.length;
    return sameColCandidates[nextIdx].number;
  }
  return current.number;
}

/**
 * Exponential backoff helper for scientific API requests (from Science skill).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  baseDelayMs = 500
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < maxRetries
    ) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const delay =
        !Number.isNaN(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} (${response.statusText}) from ${url}: ${errorBody.slice(0, 200)}`
    );
  }
  throw new Error(`Exhausted retries for ${url}`);
}

export interface PubChemElementRecord {
  cid: number | null;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: string;
  inChIKey: string;
  synonyms: string[];
  pubchemUrl: string;
  sourceStatus: 'live' | 'fallback';
}

const pubchemCache = new Map<string, PubChemElementRecord>();

/**
 * Queries NCBI PubChem PUG-REST for live chemical identifiers and synonyms of the element.
 */
export async function fetchElementPubChemData(
  element: ChemicalElement
): Promise<PubChemElementRecord> {
  const cached = pubchemCache.get(element.symbol);
  if (cached) return cached;

  const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/element/${element.number}`;
  try {
    const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
      element.name.toLowerCase()
    )}/property/IUPACName,MolecularFormula,MolecularWeight,InChIKey/JSON`;

    const res = await fetchWithRetry(propUrl);
    const data = await res.json();
    const prop = data?.PropertyTable?.Properties?.[0];
    const cid: number | null = prop?.CID ?? null;

    let synonyms: string[] = [element.name, `Element ${element.number}`, element.symbol];
    if (cid) {
      try {
        const synRes = await fetchWithRetry(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
        );
        const synData = await synRes.json();
        const rawSyns: string[] =
          synData?.InformationList?.Information?.[0]?.Synonym ?? [];
        if (rawSyns.length > 0) {
          synonyms = rawSyns.slice(0, 6);
        }
      } catch {
        // Keep default synonyms if secondary call fails
      }
    }

    const record: PubChemElementRecord = {
      cid,
      iupacName: prop?.IUPACName || element.name.toLowerCase(),
      molecularFormula: prop?.MolecularFormula || element.symbol,
      molecularWeight: String(prop?.MolecularWeight ?? element.mass),
      inChIKey: prop?.InChIKey || 'Monatomic elemental reference',
      synonyms,
      pubchemUrl,
      sourceStatus: 'live',
    };
    pubchemCache.set(element.symbol, record);
    return record;
  } catch {
    const fallback: PubChemElementRecord = {
      cid: null,
      iupacName: element.name.toLowerCase(),
      molecularFormula: element.symbol,
      molecularWeight: `${element.mass} u`,
      inChIKey: `Element-Z${element.number}-${element.symbol}`,
      synonyms: [element.name, `${element.symbol}0`, `Atomic No. ${element.number}`],
      pubchemUrl,
      sourceStatus: 'fallback',
    };
    pubchemCache.set(element.symbol, fallback);
    return fallback;
  }
}
