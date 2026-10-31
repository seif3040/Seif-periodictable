import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, wavelengthToColor } from '../data/elements';
import {
  CINEMATIC_SCENES,
  computeElementTargetPosition,
  computeResponsiveAtomCameraFraming,
  filterElements,
  getAdjacentElementNumber,
  getNextCinematicScene,
  matchesElementFilter,
} from './chemistryLogic';

test('dataset contains all 118 chemical elements with valid shells and spectra', () => {
  assert.equal(ELEMENTS.length, 118);
  for (let i = 0; i < 118; i++) {
    const el = ELEMENTS[i];
    assert.equal(el.number, i + 1, `Expected element at index ${i} to have number ${i + 1}`);
    const shellSum = el.shells.reduce((acc, v) => acc + v, 0);
    assert.equal(
      shellSum,
      el.number,
      `Shell electrons for ${el.symbol} (#${el.number}) should sum to ${el.number}, got ${shellSum}`
    );
    assert.ok(el.spectralLines.length >= 3, `${el.symbol} must have at least 3 spectral lines`);
  }
});

test('search and category/state filtering accurately match elements', () => {
  const goldMatches = filterElements(ELEMENTS, {
    query: 'Gold',
    category: 'all',
    state: 'all',
  });
  assert.equal(goldMatches.length, 1);
  assert.equal(goldMatches[0].symbol, 'Au');
  assert.equal(goldMatches[0].number, 79);

  const nobleGases = filterElements(ELEMENTS, {
    query: '',
    category: 'noble-gas',
    state: 'gas',
  });
  assert.equal(nobleGases.length, 6);

  const liquidElements = filterElements(ELEMENTS, {
    query: '',
    category: 'all',
    state: 'liquid',
  });
  assert.deepEqual(
    liquidElements.map((e) => e.symbol),
    ['Br', 'Hg']
  );

  assert.equal(
    matchesElementFilter(ELEMENTS[0], { query: '1', category: 'all', state: 'all' }),
    true
  );
});

test('3D layout coordinate calculations return finite non-overlapping coordinates across all 3 modes', () => {
  const modes = ['table', 'gallery', 'spectral'] as const;
  for (const mode of modes) {
    const hPos = computeElementTargetPosition(ELEMENTS[0], mode);
    const ogPos = computeElementTargetPosition(ELEMENTS[117], mode);
    assert.ok(Number.isFinite(hPos.x) && Number.isFinite(hPos.y) && Number.isFinite(hPos.z));
    assert.ok(Number.isFinite(ogPos.x) && Number.isFinite(ogPos.y) && Number.isFinite(ogPos.z));
    const dist = Math.hypot(hPos.x - ogPos.x, hPos.y - ogPos.y, hPos.z - ogPos.z);
    assert.ok(dist > 1, `Expected distinct positions in ${mode} mode, got dist=${dist}`);
  }
});

test('cinematic journey scene progression cycles cleanly through Scenes 2 to 5', () => {
  assert.equal(CINEMATIC_SCENES.length, 5);
  assert.equal(getNextCinematicScene('scene1-intro', 'next'), 'scene2-flythrough');
  assert.equal(getNextCinematicScene('scene2-flythrough', 'next'), 'scene3-atom-focus');
  assert.equal(getNextCinematicScene('scene3-atom-focus', 'next'), 'scene4-science-reveal');
  assert.equal(getNextCinematicScene('scene4-science-reveal', 'next'), 'scene5-spectral-finale');
  assert.equal(getNextCinematicScene('scene5-spectral-finale', 'next'), 'scene2-flythrough');
  assert.equal(getNextCinematicScene('scene4-science-reveal', 'prev'), 'scene3-atom-focus');
});

test('responsive atom camera framing shifts atom upward on mobile and leftward on desktop', () => {
  const mobileCollapsed = computeResponsiveAtomCameraFraming(390, 844, true, false);
  const mobileExpanded = computeResponsiveAtomCameraFraming(390, 844, true, true);
  assert.ok(
    mobileExpanded.lookTarget.y < mobileCollapsed.lookTarget.y,
    'Expanded mobile bottom sheet should shift camera lookTarget lower so atom moves higher on screen'
  );

  const desktopWithPanel = computeResponsiveAtomCameraFraming(1440, 900, true, false);
  const desktopNoPanel = computeResponsiveAtomCameraFraming(1440, 900, false, false);
  assert.ok(
    desktopWithPanel.lookTarget.x > desktopNoPanel.lookTarget.x,
    'Desktop side panel should offset camera lookTarget.x to keep atom centered in left space'
  );
});

test('keyboard navigation wraps cleanly and navigates columns', () => {
  assert.equal(getAdjacentElementNumber(1, 'ArrowRight'), 2);
  assert.equal(getAdjacentElementNumber(118, 'ArrowRight'), 1);
  assert.equal(getAdjacentElementNumber(1, 'ArrowLeft'), 118);
  assert.equal(getAdjacentElementNumber(1, 'ArrowDown'), 3);
  assert.equal(getAdjacentElementNumber(3, 'ArrowUp'), 1);
});

test('wavelengthToColor maps visible wavelengths to valid hex colors', () => {
  const blueHex = wavelengthToColor(450);
  const redHex = wavelengthToColor(656.3);
  assert.match(blueHex, /^#[0-9a-f]{6}$/i);
  assert.match(redHex, /^#[0-9a-f]{6}$/i);
  assert.notEqual(blueHex, redHex);
});
