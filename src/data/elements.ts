export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export type MatterState = 'gas' | 'liquid' | 'solid' | 'synthetic';

export interface SpectralLine {
  wavelengthNm: number;
  color: string;
  intensity: number; // 0.1 to 1.0
}

export interface ChemicalElement {
  number: number;
  symbol: string;
  name: string;
  mass: number;
  group: number | null; // 1-18, null for lanthanides/actinides
  period: number; // 1-7
  gridCol: number; // 1-18
  gridRow: number; // 1-10 (rows 9 and 10 are lanthanides and actinides)
  category: ElementCategory;
  state: MatterState;
  electronConfig: string;
  shells: number[];
  electronegativity: number | null;
  ionizationEnergyEv: number;
  discoveryYear: string;
  spectralLines: SpectralLine[];
  summary: string;
}

export interface CategoryMeta {
  id: ElementCategory;
  label: string;
  color: string;
  accentHex: number;
  secondaryColor: string;
}

export const CATEGORY_META: Record<ElementCategory, CategoryMeta> = {
  'alkali-metal': {
    id: 'alkali-metal',
    label: 'Alkali Metal',
    color: '#ff4d6d',
    accentHex: 0xff4d6d,
    secondaryColor: '#ff8fa3',
  },
  'alkaline-earth-metal': {
    id: 'alkaline-earth-metal',
    label: 'Alkaline Earth',
    color: '#ff9e00',
    accentHex: 0xff9e00,
    secondaryColor: '#ffbe0b',
  },
  'transition-metal': {
    id: 'transition-metal',
    label: 'Transition Metal',
    color: '#00bbf9',
    accentHex: 0x00bbf9,
    secondaryColor: '#4cc9f0',
  },
  'post-transition-metal': {
    id: 'post-transition-metal',
    label: 'Post-Transition',
    color: '#00f5d4',
    accentHex: 0x00f5d4,
    secondaryColor: '#56cfe1',
  },
  metalloid: {
    id: 'metalloid',
    label: 'Metalloid',
    color: '#fee440',
    accentHex: 0xfee440,
    secondaryColor: '#f9c74f',
  },
  'reactive-nonmetal': {
    id: 'reactive-nonmetal',
    label: 'Reactive Nonmetal',
    color: '#38b000',
    accentHex: 0x38b000,
    secondaryColor: '#70e000',
  },
  halogen: {
    id: 'halogen',
    label: 'Halogen',
    color: '#f15bb5',
    accentHex: 0xf15bb5,
    secondaryColor: '#ff70a6',
  },
  'noble-gas': {
    id: 'noble-gas',
    label: 'Noble Gas',
    color: '#9b5de5',
    accentHex: 0x9b5de5,
    secondaryColor: '#c77dff',
  },
  lanthanide: {
    id: 'lanthanide',
    label: 'Lanthanide',
    color: '#4361ee',
    accentHex: 0x4361ee,
    secondaryColor: '#4895ef',
  },
  actinide: {
    id: 'actinide',
    label: 'Actinide',
    color: '#f72585',
    accentHex: 0xf72585,
    secondaryColor: '#b5179e',
  },
};

export function wavelengthToColor(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    r = 0;
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    r = 0;
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
    b = 0;
  } else if (nm >= 645 && nm <= 750) {
    r = 1;
    g = 0;
    b = 0;
  }
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Curated spectral lines for major elements + deterministic physical emission spectrum generator for all 118
const CURATED_SPECTRA: Record<number, number[]> = {
  1: [410.2, 434.0, 486.1, 656.3], // Hydrogen Balmer series
  2: [388.9, 447.1, 501.6, 587.6, 667.8, 706.5], // Helium
  3: [460.3, 610.4, 670.8], // Lithium crimson
  6: [426.7, 477.2, 514.5, 589.0, 658.3], // Carbon
  7: [404.1, 500.5, 568.0, 648.2], // Nitrogen
  8: [436.8, 533.0, 615.8, 700.2], // Oxygen
  10: [540.1, 585.2, 603.0, 614.3, 640.2, 650.7], // Neon red-orange
  11: [498.3, 568.8, 589.0, 589.6, 615.4], // Sodium D-lines
  12: [383.8, 448.1, 516.7, 517.3, 518.4], // Magnesium triplet
  18: [415.9, 420.1, 451.1, 696.5, 706.7, 738.4], // Argon violet-blue
  19: [404.4, 404.7, 691.1, 693.9], // Potassium lilac
  20: [422.7, 445.5, 558.9, 616.2, 643.9], // Calcium
  26: [404.6, 438.4, 495.8, 516.7, 527.0, 561.6], // Iron
  29: [406.3, 510.6, 515.3, 521.8, 578.2], // Copper green-blue
  36: [427.4, 431.9, 557.0, 587.1, 645.6], // Krypton
  38: [407.8, 460.7, 606.0, 640.8, 687.8], // Strontium red
  47: [405.5, 421.1, 520.9, 546.5], // Silver
  54: [450.1, 462.4, 467.1, 492.3, 589.5, 687.2], // Xenon blue
  56: [455.4, 493.4, 553.5, 614.2, 649.7], // Barium green
  79: [406.5, 479.3, 523.0, 583.7, 627.8], // Gold
  80: [404.7, 435.8, 546.1, 577.0, 579.1], // Mercury
  86: [435.0, 508.5, 607.4, 705.5], // Radon
  92: [409.0, 424.2, 502.7, 549.3, 591.5, 644.9], // Uranium
};

function generateSpectrumForElement(num: number, category: ElementCategory): SpectralLine[] {
  const curated = CURATED_SPECTRA[num];
  if (curated) {
    return curated.map((nm, idx) => ({
      wavelengthNm: nm,
      color: wavelengthToColor(nm),
      intensity: Number((0.65 + ((num * 7 + idx * 13) % 35) / 100).toFixed(2)),
    }));
  }
  const count = 5 + (num % 4);
  const lines: SpectralLine[] = [];
  const catSeed = category.length * 19;
  for (let i = 0; i < count; i++) {
    const raw = (num * 43 + i * 67 + catSeed) % 340;
    const nm = Number((390 + raw + ((num * 3 + i * 7) % 10) * 0.3).toFixed(1));
    lines.push({
      wavelengthNm: nm,
      color: wavelengthToColor(nm),
      intensity: Number((0.45 + ((num * 11 + i * 23) % 55) / 100).toFixed(2)),
    });
  }
  return lines.sort((a, b) => a.wavelengthNm - b.wavelengthNm);
}

// Compact tuple format for all 118 elements:
// [number, symbol, name, mass, group, period, gridCol, gridRow, category, state, electronConfig, shells, electronegativity, ionizationEv, discoveryYear, summary]
type RawElementTuple = [
  number,
  string,
  string,
  number,
  number | null,
  number,
  number,
  number,
  ElementCategory,
  MatterState,
  string,
  number[],
  number | null,
  number,
  string,
  string,
];

const RAW_ELEMENTS: RawElementTuple[] = [
  [1, 'H', 'Hydrogen', 1.008, 1, 1, 1, 1, 'reactive-nonmetal', 'gas', '1s¹', [1], 2.2, 13.598, '1766', 'The most abundant chemical substance in the cosmos, fueling stellar nucleosynthesis across galaxies.'],
  [2, 'He', 'Helium', 4.0026, 18, 1, 18, 1, 'noble-gas', 'gas', '1s²', [2], null, 24.587, '1868', 'First detected as a bright yellow spectral line in solar eclipse light before being found on Earth.'],
  [3, 'Li', 'Lithium', 6.94, 1, 2, 1, 2, 'alkali-metal', 'solid', '[He] 2s¹', [2, 1], 0.98, 5.392, '1817', 'The lightest solid metal, critical for high-density energy storage and crimson pyrotechnic spectra.'],
  [4, 'Be', 'Beryllium', 9.0122, 2, 2, 2, 2, 'alkaline-earth-metal', 'solid', '[He] 2s²', [2, 2], 1.57, 9.323, '1798', 'Stiff, lightweight metal used in space telescope mirrors and X-ray windows.'],
  [5, 'B', 'Boron', 10.81, 13, 2, 13, 2, 'metalloid', 'solid', '[He] 2s² 2p¹', [2, 3], 2.04, 8.298, '1808', 'Cosmogenic metalloid essential for borosilicate laboratory glass and high-strength neodymium magnets.'],
  [6, 'C', 'Carbon', 12.011, 14, 2, 14, 2, 'reactive-nonmetal', 'solid', '[He] 2s² 2p²', [2, 4], 2.55, 11.26, 'Ancient', 'Tetravalent backbone of organic biochemistry, forming diamond lattices, graphene sheets, and fullerenes.'],
  [7, 'N', 'Nitrogen', 14.007, 15, 2, 15, 2, 'reactive-nonmetal', 'gas', '[He] 2s² 2p³', [2, 5], 3.04, 14.534, '1772', 'Diatomic gas making up 78% of Earth’s atmosphere and a key constituent of amino acids and nucleic acids.'],
  [8, 'O', 'Oxygen', 15.999, 16, 2, 16, 2, 'reactive-nonmetal', 'gas', '[He] 2s² 2p⁴', [2, 6], 3.44, 13.618, '1774', 'Highly reactive chalcogen essential for aerobic cellular respiration and planetary crust silicates.'],
  [9, 'F', 'Fluorine', 18.998, 17, 2, 17, 2, 'halogen', 'gas', '[He] 2s² 2p⁵', [2, 7], 3.98, 17.423, '1886', 'The most electronegative chemical element, capable of reacting with nearly every substance including noble gases.'],
  [10, 'Ne', 'Neon', 20.18, 18, 2, 18, 2, 'noble-gas', 'gas', '[He] 2s² 2p⁶', [2, 8], null, 21.565, '1898', 'Monatomic noble gas that emits an iconic reddish-orange glow in high-voltage discharge tubes.'],
  [11, 'Na', 'Sodium', 22.99, 1, 3, 1, 3, 'alkali-metal', 'solid', '[Ne] 3s¹', [2, 8, 1], 0.93, 5.139, '1807', 'Soft, silvery alkali metal famous for its intense Fraunhofer D-line yellow emission doublet at 589 nm.'],
  [12, 'Mg', 'Magnesium', 24.305, 2, 3, 2, 3, 'alkaline-earth-metal', 'solid', '[Ne] 3s²', [2, 8, 2], 1.31, 7.646, '1755', 'Forms the coordination center of chlorophyll molecules in photosynthetic plants and burns with brilliant white light.'],
  [13, 'Al', 'Aluminium', 26.982, 13, 3, 13, 3, 'post-transition-metal', 'solid', '[Ne] 3s² 3p¹', [2, 8, 3], 1.61, 5.986, '1825', 'Most abundant metallic element in Earth’s crust, prized for its low density and passivating oxide layer.'],
  [14, 'Si', 'Silicon', 28.085, 14, 3, 14, 3, 'metalloid', 'solid', '[Ne] 3s² 3p²', [2, 8, 4], 1.9, 8.152, '1824', 'Crystalline semiconductor metalloid forming the foundation of modern integrated circuits and silicate minerals.'],
  [15, 'P', 'Phosphorus', 30.974, 15, 3, 15, 3, 'reactive-nonmetal', 'solid', '[Ne] 3s² 3p³', [2, 8, 5], 2.19, 10.487, '1669', 'Essential bio-element forming the sugar-phosphate backbone of DNA, RNA, and cellular ATP energy currency.'],
  [16, 'S', 'Sulfur', 32.06, 16, 3, 16, 3, 'reactive-nonmetal', 'solid', '[Ne] 3s² 3p⁴', [2, 8, 6], 2.58, 10.36, 'Ancient', 'Bright yellow nonmetal occurring near volcanic vents and forming disulfide bridges in protein tertiary structures.'],
  [17, 'Cl', 'Chlorine', 35.45, 17, 3, 17, 3, 'halogen', 'gas', '[Ne] 3s² 3p⁵', [2, 8, 7], 3.16, 12.968, '1774', 'Yellow-green halogen gas crucial for water sanitation, osmotic balance in biology, and industrial synthesis.'],
  [18, 'Ar', 'Argon', 39.948, 18, 3, 18, 3, 'noble-gas', 'gas', '[Ne] 3s² 3p⁶', [2, 8, 8], null, 15.76, '1894', 'Third most abundant gas in Earth’s atmosphere, widely used as an inert shielding atmosphere and blue-violet plasma gas.'],
  [19, 'K', 'Potassium', 39.098, 1, 4, 1, 4, 'alkali-metal', 'solid', '[Ar] 4s¹', [2, 8, 8, 1], 0.82, 4.341, '1807', 'Electrolyte metal critical for neuronal action potentials and radiating a distinctive lilac flame spectrum.'],
  [20, 'Ca', 'Calcium', 40.078, 2, 4, 2, 4, 'alkaline-earth-metal', 'solid', '[Ar] 4s²', [2, 8, 8, 2], 1.0, 6.113, '1808', 'Structural mineral of vertebrate bone and shells, and universal intracellular signaling ion.'],
  [21, 'Sc', 'Scandium', 44.956, 3, 4, 3, 4, 'transition-metal', 'solid', '[Ar] 3d¹ 4s²', [2, 8, 9, 2], 1.36, 6.561, '1879', 'First d-block transition metal, used in aerospace aluminum-scandium alloys and stadium metal-halide lamps.'],
  [22, 'Ti', 'Titanium', 47.867, 4, 4, 4, 4, 'transition-metal', 'solid', '[Ar] 3d² 4s²', [2, 8, 10, 2], 1.54, 6.828, '1791', 'High strength-to-weight transition metal completely resistant to seawater corrosion and biocompatible with bone.'],
  [23, 'V', 'Vanadium', 50.942, 5, 4, 5, 4, 'transition-metal', 'solid', '[Ar] 3d³ 4s²', [2, 8, 11, 2], 1.63, 6.746, '1801', 'Known for its vivid, multicolored oxidation states (+2 violet, +3 green, +4 blue, +5 yellow) and grid-scale redox batteries.'],
  [24, 'Cr', 'Chromium', 51.996, 6, 4, 6, 4, 'transition-metal', 'solid', '[Ar] 3d⁵ 4s¹', [2, 8, 13, 1], 1.66, 6.767, '1797', 'Lustrous hard metal responsible for the mirror polish of stainless steel and the deep red hue of ruby corundum.'],
  [25, 'Mn', 'Manganese', 54.938, 7, 4, 7, 4, 'transition-metal', 'solid', '[Ar] 3d⁵ 4s²', [2, 8, 13, 2], 1.55, 7.434, '1774', 'Catalytic core of the oxygen-evolving complex in Photosystem II that splits water during photosynthesis.'],
  [26, 'Fe', 'Iron', 55.845, 8, 4, 8, 4, 'transition-metal', 'solid', '[Ar] 3d⁶ 4s²', [2, 8, 14, 2], 1.83, 7.902, 'Ancient', 'Endpoint of exothermic stellar fusion in massive stars, generating Earth’s magnetosphere and carrying oxygen in hemoglobin.'],
  [27, 'Co', 'Cobalt', 58.933, 9, 4, 9, 4, 'transition-metal', 'solid', '[Ar] 3d⁷ 4s²', [2, 8, 15, 2], 1.88, 7.881, '1735', 'Ferromagnetic metal at the center of Vitamin B12 (cobalamin) and famous for deep cobalt-blue ceramic pigments.'],
  [28, 'Ni', 'Nickel', 58.693, 10, 4, 10, 4, 'transition-metal', 'solid', '[Ar] 3d⁸ 4s²', [2, 8, 16, 2], 1.91, 7.64, '1751', 'Corrosion-resistant ferromagnetic metal abundant in iron-nickel meteorites and high-temperature turbine superalloys.'],
  [29, 'Cu', 'Copper', 63.546, 11, 4, 11, 4, 'transition-metal', 'solid', '[Ar] 3d¹⁰ 4s¹', [2, 8, 18, 1], 1.9, 7.726, 'Ancient', 'Distinctive reddish-orange metal with exceptional electrical conductivity and emerald-green spectral emission lines.'],
  [30, 'Zn', 'Zinc', 65.38, 12, 4, 12, 4, 'transition-metal', 'solid', '[Ar] 3d¹⁰ 4s²', [2, 8, 18, 2], 1.65, 9.394, '1746', 'Essential cofactor in over 300 enzymes including carbonic anhydrase and zinc-finger DNA-binding transcription factors.'],
  [31, 'Ga', 'Gallium', 69.723, 13, 4, 13, 4, 'post-transition-metal', 'solid', '[Ar] 3d¹⁰ 4s² 4p¹', [2, 8, 18, 3], 1.81, 5.999, '1875', 'Silvery metal that melts at 29.76 °C in the palm of a human hand and powers blue/violet GaN optoelectronics.'],
  [32, 'Ge', 'Germanium', 72.63, 14, 4, 14, 4, 'metalloid', 'solid', '[Ar] 3d¹⁰ 4s² 4p²', [2, 8, 18, 4], 2.01, 7.9, '1886', 'High-index infrared-transparent metalloid used in fiber-optic cores and early point-contact transistors.'],
  [33, 'As', 'Arsenic', 74.922, 15, 4, 15, 4, 'metalloid', 'solid', '[Ar] 3d¹⁰ 4s² 4p³', [2, 8, 18, 5], 2.18, 9.789, '1250', 'Pnictogen metalloid used in high-speed gallium arsenide solar cells and laser diodes.'],
  [34, 'Se', 'Selenium', 78.971, 16, 4, 16, 4, 'reactive-nonmetal', 'solid', '[Ar] 3d¹⁰ 4s² 4p⁴', [2, 8, 18, 6], 2.55, 9.752, '1817', 'Photoconductive chalcogen incorporated into antioxidant glutathione peroxidase enzymes as selenocysteine.'],
  [35, 'Br', 'Bromine', 79.904, 17, 4, 17, 4, 'halogen', 'liquid', '[Ar] 3d¹⁰ 4s² 4p⁵', [2, 8, 18, 7], 2.96, 11.814, '1826', 'One of only two elements liquid at standard room temperature, forming a dense reddish-brown volatile liquid.'],
  [36, 'Kr', 'Krypton', 83.798, 18, 4, 18, 4, 'noble-gas', 'gas', '[Ar] 3d¹⁰ 4s² 4p⁶', [2, 8, 18, 8], 3.0, 14.0, '1898', 'Noble gas whose sharp orange-red spectral line from Kr-86 formerly defined the international standard meter.'],
  [37, 'Rb', 'Rubidium', 85.468, 1, 5, 1, 5, 'alkali-metal', 'solid', '[Kr] 5s¹', [2, 8, 18, 8, 1], 0.82, 4.177, '1861', 'Named for its deep red spectral lines; used in ultra-precise rubidium atomic clocks and Bose-Einstein condensates.'],
  [38, 'Sr', 'Strontium', 87.62, 2, 5, 2, 5, 'alkaline-earth-metal', 'solid', '[Kr] 5s²', [2, 8, 18, 8, 2], 0.95, 5.695, '1790', 'Produces brilliant crimson-red atomic emission and powers optical lattice clocks accurate to one second in 15 billion years.'],
  [39, 'Y', 'Yttrium', 88.906, 3, 5, 3, 5, 'transition-metal', 'solid', '[Kr] 4d¹ 5s²', [2, 8, 18, 9, 2], 1.22, 6.217, '1794', 'Key element in YBCO high-temperature superconductors and Nd:YAG solid-state lasers.'],
  [40, 'Zr', 'Zirconium', 91.224, 4, 5, 4, 5, 'transition-metal', 'solid', '[Kr] 4d² 5s²', [2, 8, 18, 10, 2], 1.33, 6.634, '1789', 'Features ultra-low thermal neutron absorption cross-section and forms ancient zircon crystals dating back 4.4 billion years.'],
  [41, 'Nb', 'Niobium', 92.906, 5, 5, 5, 5, 'transition-metal', 'solid', '[Kr] 4d⁴ 5s¹', [2, 8, 18, 12, 1], 1.6, 6.759, '1801', 'Superconducting transition metal used in MRI magnets and particle accelerator RF cavities.'],
  [42, 'Mo', 'Molybdenum', 95.95, 6, 5, 6, 5, 'transition-metal', 'solid', '[Kr] 4d⁵ 5s¹', [2, 8, 18, 13, 1], 2.16, 7.092, '1778', 'Refractory metal and essential biological cofactor in nitrogenase enzymes that fix atmospheric nitrogen.'],
  [43, 'Tc', 'Technetium', 98, 7, 5, 7, 5, 'transition-metal', 'synthetic', '[Kr] 4d⁵ 5s²', [2, 8, 18, 13, 2], 1.9, 7.28, '1937', 'The lightest element with no stable isotopes; metastable Tc-99m is the workhorse tracer of nuclear medicine imaging.'],
  [44, 'Ru', 'Ruthenium', 101.07, 8, 5, 8, 5, 'transition-metal', 'solid', '[Kr] 4d⁷ 5s¹', [2, 8, 18, 15, 1], 2.2, 7.361, '1844', 'Platinum-group metal used in Grubbs olefin metathesis catalysts and wear-resistant electrical contacts.'],
  [45, 'Rh', 'Rhodium', 102.91, 9, 5, 9, 5, 'transition-metal', 'solid', '[Kr] 4d⁸ 5s¹', [2, 8, 18, 16, 1], 2.28, 7.459, '1803', 'Highly reflective, corrosion-proof noble metal essential for automotive catalytic converters.'],
  [46, 'Pd', 'Palladium', 106.42, 10, 5, 10, 5, 'transition-metal', 'solid', '[Kr] 4d¹⁰', [2, 8, 18, 18], 2.2, 8.337, '1803', 'Uniquely features a filled 4d¹⁰ outer shell with zero 5s electrons and absorbs up to 900 times its volume in hydrogen.'],
  [47, 'Ag', 'Silver', 107.87, 11, 5, 11, 5, 'transition-metal', 'solid', '[Kr] 4d¹⁰ 5s¹', [2, 8, 18, 18, 1], 1.93, 7.576, 'Ancient', 'Possesses the highest electrical conductivity, thermal conductivity, and optical reflectivity of any metal.'],
  [48, 'Cd', 'Cadmium', 112.41, 12, 5, 12, 5, 'transition-metal', 'solid', '[Kr] 4d¹⁰ 5s²', [2, 8, 18, 18, 2], 1.69, 8.994, '1817', 'Used in CdSe colloidal quantum dots whose fluorescence wavelength tunes across the visible spectrum with particle radius.'],
  [49, 'In', 'Indium', 114.82, 13, 5, 13, 5, 'post-transition-metal', 'solid', '[Kr] 4d¹⁰ 5s² 5p¹', [2, 8, 18, 18, 3], 1.78, 5.786, '1863', 'Named for its brilliant indigo blue spectral line at 451 nm; forms transparent conductive ITO touchscreens.'],
  [50, 'Sn', 'Tin', 118.71, 14, 5, 14, 5, 'post-transition-metal', 'solid', '[Kr] 4d¹⁰ 5s² 5p²', [2, 8, 18, 18, 4], 1.96, 7.344, 'Ancient', 'Has the greatest number of stable isotopes (10) of any element due to its magic proton number Z = 50.'],
  [51, 'Sb', 'Antimony', 121.76, 15, 5, 15, 5, 'metalloid', 'solid', '[Kr] 4d¹⁰ 5s² 5p³', [2, 8, 18, 18, 5], 2.05, 8.608, 'Ancient', 'Lustrous gray metalloid that expands upon freezing, historically used to cast razor-sharp printing type.'],
  [52, 'Te', 'Tellurium', 127.6, 16, 5, 16, 5, 'metalloid', 'solid', '[Kr] 4d¹⁰ 5s² 5p⁴', [2, 8, 18, 18, 6], 2.1, 9.01, '1782', 'Rare metalloid used in cadmium telluride thin-film solar panels and phase-change optical memory discs.'],
  [53, 'I', 'Iodine', 126.9, 17, 5, 17, 5, 'halogen', 'solid', '[Kr] 4d¹⁰ 5s² 5p⁵', [2, 8, 18, 18, 7], 2.66, 10.451, '1811', 'Lustrous purple-black crystalline halogen that sublimes into a rich violet vapor and is essential for thyroid hormones.'],
  [54, 'Xe', 'Xenon', 131.29, 18, 5, 18, 5, 'noble-gas', 'gas', '[Kr] 4d¹⁰ 5s² 5p⁶', [2, 8, 18, 18, 8], 2.6, 12.13, '1898', 'Dense noble gas that emits a sky-blue plasma glow and propels deep-space Hall-effect ion thrusters.'],
  [55, 'Cs', 'Cesium', 132.91, 1, 6, 1, 6, 'alkali-metal', 'solid', '[Xe] 6s¹', [2, 8, 18, 18, 8, 1], 0.79, 3.894, '1860', 'Pale gold alkali metal whose hyperfine transition defines the SI second at 9,192,631,770 Hz.'],
  [56, 'Ba', 'Barium', 137.33, 2, 6, 2, 6, 'alkaline-earth-metal', 'solid', '[Xe] 6s²', [2, 8, 18, 18, 8, 2], 0.89, 5.212, '1808', 'Heavy alkaline earth metal emitting vibrant apple-green spectral lines and providing X-ray radiocontrast.'],
  [57, 'La', 'Lanthanum', 138.91, null, 6, 3, 9, 'lanthanide', 'solid', '[Xe] 5d¹ 6s²', [2, 8, 18, 18, 9, 2], 1.1, 5.577, '1839', 'Archetype of the lanthanide series, used in high-refractive-index camera lenses and hybrid battery anodes.'],
  [58, 'Ce', 'Cerium', 140.12, null, 6, 4, 9, 'lanthanide', 'solid', '[Xe] 4f¹ 5d¹ 6s²', [2, 8, 18, 19, 9, 2], 1.12, 5.539, '1803', 'Most abundant rare-earth element, sparking readily when struck and polishing precision astronomical optics.'],
  [59, 'Pr', 'Praseodymium', 140.91, null, 6, 5, 9, 'lanthanide', 'solid', '[Xe] 4f³ 6s²', [2, 8, 18, 21, 8, 2], 1.13, 5.473, '1885', 'Forms emerald-green salts and didymium glass that filters out yellow sodium glare for glassblowers.'],
  [60, 'Nd', 'Neodymium', 144.24, null, 6, 6, 9, 'lanthanide', 'solid', '[Xe] 4f⁴ 6s²', [2, 8, 18, 22, 8, 2], 1.14, 5.525, '1885', 'Powers the strongest permanent magnets known (Nd₂Fe₁₄B), driving electric vehicles, wind turbines, and headphones.'],
  [61, 'Pm', 'Promethium', 145, null, 6, 7, 9, 'lanthanide', 'synthetic', '[Xe] 4f⁵ 6s²', [2, 8, 18, 23, 8, 2], 1.13, 5.582, '1945', 'Radioactive lanthanide named after Prometheus; its beta emissions excite phosphors in self-luminous gauges.'],
  [62, 'Sm', 'Samarium', 150.36, null, 6, 8, 9, 'lanthanide', 'solid', '[Xe] 4f⁶ 6s²', [2, 8, 18, 24, 8, 2], 1.17, 5.644, '1879', 'Alloys with cobalt to form permanent magnets that retain magnetism at red-hot temperatures above 700 °C.'],
  [63, 'Eu', 'Europium', 151.96, null, 6, 9, 9, 'lanthanide', 'solid', '[Xe] 4f⁷ 6s²', [2, 8, 18, 25, 8, 2], 1.2, 5.67, '1901', 'Phosphorescent lanthanide emitting pure red and blue light in displays and anti-counterfeiting Euro banknotes.'],
  [64, 'Gd', 'Gadolinium', 157.25, null, 6, 10, 9, 'lanthanide', 'solid', '[Xe] 4f⁷ 5d¹ 6s²', [2, 8, 18, 25, 9, 2], 1.2, 6.15, '1880', 'Possesses 7 unpaired f-electrons, conferring strong paramagnetism for MRI contrast agents and magnetocaloric cooling.'],
  [65, 'Tb', 'Terbium', 158.93, null, 6, 11, 9, 'lanthanide', 'solid', '[Xe] 4f⁹ 6s²', [2, 8, 18, 27, 8, 2], 1.2, 5.864, '1843', 'Emits brilliant 545 nm green luminescence and forms Terfenol-D, an alloy that changes shape in magnetic fields.'],
  [66, 'Dy', 'Dysprosium', 162.5, null, 6, 12, 9, 'lanthanide', 'solid', '[Xe] 4f¹⁰ 6s²', [2, 8, 18, 28, 8, 2], 1.22, 5.939, '1886', 'Has one of the highest magnetic strengths of any element, particularly at cryogenic temperatures.'],
  [67, 'Ho', 'Holmium', 164.93, null, 6, 13, 9, 'lanthanide', 'solid', '[Xe] 4f¹¹ 6s²', [2, 8, 18, 29, 8, 2], 1.23, 6.022, '1878', 'Possesses the highest magnetic moment (10.6 Bohr magnetons) of any naturally occurring element.'],
  [68, 'Er', 'Erbium', 167.26, null, 6, 14, 9, 'lanthanide', 'solid', '[Xe] 4f¹² 6s²', [2, 8, 18, 30, 8, 2], 1.24, 6.108, '1843', 'Er³⁺ ions amplify 1550 nm optical signals directly inside transoceanic fiber-optic internet cables.'],
  [69, 'Tm', 'Thulium', 168.93, null, 6, 15, 9, 'lanthanide', 'solid', '[Xe] 4f¹³ 6s²', [2, 8, 18, 31, 8, 2], 1.25, 6.184, '1879', 'Least abundant non-radioactive rare-earth metal, emitting blue fluorescence under ultraviolet excitation.'],
  [70, 'Yb', 'Ytterbium', 173.05, null, 6, 16, 9, 'lanthanide', 'solid', '[Xe] 4f¹⁴ 6s²', [2, 8, 18, 32, 8, 2], 1.1, 6.254, '1878', 'Closed-shell 4f¹⁴ lanthanide used in ultra-high-stability optical atomic clocks and fiber lasers.'],
  [71, 'Lu', 'Lutetium', 174.97, null, 6, 17, 9, 'lanthanide', 'solid', '[Xe] 4f¹⁴ 5d¹ 6s²', [2, 8, 18, 32, 9, 2], 1.27, 5.426, '1907', 'Hardest and densest lanthanide, used in Lu-Hf radiometric dating of meteorites and PET detector crystals.'],
  [72, 'Hf', 'Hafnium', 178.49, 4, 6, 4, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d² 6s²', [2, 8, 18, 32, 10, 2], 1.3, 6.825, '1923', 'Provides the high-k dielectric gate oxide (HfO₂) inside billions of modern nanoscale CPU transistors.'],
  [73, 'Ta', 'Tantalum', 180.95, 5, 6, 5, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d³ 6s²', [2, 8, 18, 32, 11, 2], 1.5, 7.55, '1802', 'Impervious to chemical attack below 150 °C and essential for high-capacitance miniature electronics.'],
  [74, 'W', 'Tungsten', 183.84, 6, 6, 6, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d⁴ 6s²', [2, 8, 18, 32, 12, 2], 2.36, 7.864, '1783', 'Holds the highest melting point (3,695 K) and tensile strength of any pure metal in the periodic table.'],
  [75, 'Re', 'Rhenium', 186.21, 7, 6, 7, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d⁵ 6s²', [2, 8, 18, 32, 13, 2], 1.9, 7.833, '1925', 'One of the rarest elements in Earth’s crust, enabling single-crystal jet turbine blades to survive extreme heat.'],
  [76, 'Os', 'Osmium', 190.23, 8, 6, 8, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d⁶ 6s²', [2, 8, 18, 32, 14, 2], 2.2, 8.438, '1803', 'The densest naturally occurring element on Earth (22.59 g/cm³), with a distinctive bluish-silver metallic luster.'],
  [77, 'Ir', 'Iridium', 192.22, 9, 6, 9, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d⁷ 6s²', [2, 8, 18, 32, 15, 2], 2.2, 8.967, '1803', 'Most corrosion-resistant metal known; global iridium enrichment marks the 66-million-year-old K-Pg asteroid impact boundary.'],
  [78, 'Pt', 'Platinum', 195.08, 10, 6, 10, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d⁹ 6s¹', [2, 8, 18, 32, 17, 1], 2.28, 8.959, '1735', 'Unreactive noble metal powerhouse for hydrogen fuel-cell electrocatalysis and cisplatin chemotherapy.'],
  [79, 'Au', 'Gold', 196.97, 11, 6, 11, 6, 'transition-metal', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', [2, 8, 18, 32, 18, 1], 2.54, 9.226, 'Ancient', 'Relativistic contraction of its 6s orbital absorbs blue light, giving gold its iconic warm yellow metallic sheen.'],
  [80, 'Hg', 'Mercury', 200.59, 12, 6, 12, 6, 'transition-metal', 'liquid', '[Xe] 4f¹⁴ 5d¹⁰ 6s²', [2, 8, 18, 32, 18, 2], 2.0, 10.438, 'Ancient', 'The only metallic element that is liquid at standard temperature and pressure, exhibiting strong blue-green spectral lines.'],
  [81, 'Tl', 'Thallium', 204.38, 13, 6, 13, 6, 'post-transition-metal', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', [2, 8, 18, 32, 18, 3], 1.62, 6.108, '1861', 'Named from the Greek thallos (green shoot) for its brilliant 535 nm emerald-green spectral emission line.'],
  [82, 'Pb', 'Lead', 207.2, 14, 6, 14, 6, 'post-transition-metal', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', [2, 8, 18, 32, 18, 4], 2.33, 7.417, 'Ancient', 'Heaviest element with stable isotopes (magic proton number Z = 82), endpoint of natural uranium/thorium decay chains.'],
  [83, 'Bi', 'Bismuth', 208.98, 15, 6, 15, 6, 'post-transition-metal', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', [2, 8, 18, 32, 18, 5], 2.02, 7.286, '1753', 'Forms iridescent stair-stepped hopper crystals with rainbow oxide interference and strong diamagnetic levitation.'],
  [84, 'Po', 'Polonium', 209, 16, 6, 16, 6, 'post-transition-metal', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', [2, 8, 18, 32, 18, 6], 2.0, 8.417, '1898', 'Discovered by Marie and Pierre Curie; crystallizes in a unique simple cubic lattice and emits intense alpha radiation.'],
  [85, 'At', 'Astatine', 210, 17, 6, 17, 6, 'halogen', 'solid', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', [2, 8, 18, 32, 18, 7], 2.2, 9.318, '1940', 'Rarest naturally occurring element in Earth’s crust, with less than one gram existing across the planet at any instant.'],
  [86, 'Rn', 'Radon', 222, 18, 6, 18, 6, 'noble-gas', 'gas', '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', [2, 8, 18, 32, 18, 8], 2.2, 10.748, '1900', 'Dense, radioactive noble gas that glows yellow-orange when cooled below its freezing point.'],
  [87, 'Fr', 'Francium', 223, 1, 7, 1, 7, 'alkali-metal', 'solid', '[Rn] 7s¹', [2, 8, 18, 32, 18, 8, 1], 0.79, 4.073, '1939', 'Second rarest natural element; its single valence 7s electron makes it the most electropositive of all known elements.'],
  [88, 'Ra', 'Radium', 226, 2, 7, 2, 7, 'alkaline-earth-metal', 'solid', '[Rn] 7s²', [2, 8, 18, 32, 18, 8, 2], 0.9, 5.278, '1898', 'Radioluminescent alkaline earth metal that excites surrounding nitrogen molecules to emit a faint blue glow.'],
  [89, 'Ac', 'Actinium', 227, null, 7, 3, 10, 'actinide', 'solid', '[Rn] 6d¹ 7s²', [2, 8, 18, 32, 18, 9, 2], 1.1, 5.17, '1899', 'Gives its name to the actinide series; glows pale blue in the dark due to intense Cherenkov and air-ionization radiation.'],
  [90, 'Th', 'Thorium', 232.04, null, 7, 4, 10, 'actinide', 'solid', '[Rn] 6d² 7s²', [2, 8, 18, 32, 18, 10, 2], 1.3, 6.307, '1829', 'Primordial actinide whose radioactive decay contributes a major portion of Earth’s internal geothermal heat.'],
  [91, 'Pa', 'Protactinium', 231.04, null, 7, 5, 10, 'actinide', 'solid', '[Rn] 5f² 6d¹ 7s²', [2, 8, 18, 32, 20, 9, 2], 1.5, 5.89, '1913', 'Dense, silvery-gray superconducting actinide bridging thorium and uranium in the 5f orbital filling sequence.'],
  [92, 'U', 'Uranium', 238.03, null, 7, 6, 10, 'actinide', 'solid', '[Rn] 5f³ 6d¹ 7s²', [2, 8, 18, 32, 21, 9, 2], 1.38, 6.194, '1789', 'Heaviest primordial element; fuels nuclear fission reactors and imparts vivid yellow-green UV fluorescence to vaseline glass.'],
  [93, 'Np', 'Neptunium', 237, null, 7, 7, 10, 'actinide', 'synthetic', '[Rn] 5f⁴ 6d¹ 7s²', [2, 8, 18, 32, 22, 9, 2], 1.36, 6.266, '1940', 'First synthetic transuranic element, exhibiting the widest liquid temperature range of any known element.'],
  [94, 'Pu', 'Plutonium', 244, null, 7, 8, 10, 'actinide', 'synthetic', '[Rn] 5f⁶ 7s²', [2, 8, 18, 32, 24, 8, 2], 1.28, 6.026, '1940', 'Exhibits six distinct solid allotropes and powers radioisotope thermoelectric generators (Pu-238) on Voyager and Mars rovers.'],
  [95, 'Am', 'Americium', 243, null, 7, 9, 10, 'actinide', 'synthetic', '[Rn] 5f⁷ 7s²', [2, 8, 18, 32, 25, 8, 2], 1.3, 5.974, '1944', 'The only synthetic transuranic element found in household ionization smoke detectors (Am-241).'],
  [96, 'Cm', 'Curium', 247, null, 7, 10, 10, 'actinide', 'synthetic', '[Rn] 5f⁷ 6d¹ 7s²', [2, 8, 18, 32, 25, 9, 2], 1.3, 5.992, '1944', 'Named after Marie and Pierre Curie; serves as the alpha-particle source in planetary X-ray spectrometers.'],
  [97, 'Bk', 'Berkelium', 247, null, 7, 11, 10, 'actinide', 'synthetic', '[Rn] 5f⁹ 7s²', [2, 8, 18, 32, 27, 8, 2], 1.3, 6.198, '1949', 'Synthesized at UC Berkeley; essential target material used to synthesize element 117 (Tennessine).'],
  [98, 'Cf', 'Californium', 251, null, 7, 12, 10, 'actinide', 'synthetic', '[Rn] 5f¹⁰ 7s²', [2, 8, 18, 32, 28, 8, 2], 1.3, 6.282, '1950', 'Powerful neutron emitter (Cf-252) used to initiate nuclear reactor startups and analyze mineral coal beds.'],
  [99, 'Es', 'Einsteinium', 252, null, 7, 13, 10, 'actinide', 'synthetic', '[Rn] 5f¹¹ 7s²', [2, 8, 18, 32, 29, 8, 2], 1.3, 6.42, '1952', 'First discovered in the debris of the Ivy Mike thermonuclear test; glows visibly blue from its own decay energy.'],
  [100, 'Fm', 'Fermium', 257, null, 7, 14, 10, 'actinide', 'synthetic', '[Rn] 5f¹² 7s²', [2, 8, 18, 32, 30, 8, 2], 1.3, 6.5, '1952', 'Heaviest element that can be synthesized by neutron bombardment of lighter elements.'],
  [101, 'Md', 'Mendelevium', 258, null, 7, 15, 10, 'actinide', 'synthetic', '[Rn] 5f¹³ 7s²', [2, 8, 18, 32, 31, 8, 2], 1.3, 6.58, '1955', 'Named in honor of Dmitri Mendeleev; the first element synthesized one atom at a time by alpha-particle recoil.'],
  [102, 'No', 'Nobelium', 259, null, 7, 16, 10, 'actinide', 'synthetic', '[Rn] 5f¹⁴ 7s²', [2, 8, 18, 32, 32, 8, 2], 1.3, 6.65, '1966', 'Closed 5f¹⁴ shell favors a stable divalent (+2) oxidation state in aqueous solution unlike lighter actinides.'],
  [103, 'Lr', 'Lawrencium', 266, null, 7, 17, 10, 'actinide', 'synthetic', '[Rn] 5f¹⁴ 7s² 7p¹', [2, 8, 18, 32, 32, 8, 3], 1.3, 4.9, '1961', 'Final member of the actinide block; relativistic stabilization places its outer electron in the 7p₁/₂ orbital.'],
  [104, 'Rf', 'Rutherfordium', 267, 4, 7, 4, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d² 7s²', [2, 8, 18, 32, 32, 10, 2], null, 6.01, '1969', 'First transactinide superheavy element, chemically homologous to hafnium and zirconium in Group 4.'],
  [105, 'Db', 'Dubnium', 268, 5, 7, 5, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d³ 7s²', [2, 8, 18, 32, 32, 11, 2], null, 6.8, '1970', 'Named after the Joint Institute for Nuclear Research in Dubna; exhibits Group 5 pentavalent chemistry.'],
  [106, 'Sg', 'Seaborgium', 269, 6, 7, 6, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁴ 7s²', [2, 8, 18, 32, 32, 12, 2], null, 7.8, '1974', 'Forms volatile hexacarbonyl complexes Sg(CO)₆ analogous to tungsten and molybdenum.'],
  [107, 'Bh', 'Bohrium', 270, 7, 7, 7, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁵ 7s²', [2, 8, 18, 32, 32, 13, 2], null, 7.7, '1981', 'Named after Niels Bohr, pioneer of quantum atomic orbitals; forms volatile oxychloride BhO₃Cl.'],
  [108, 'Hs', 'Hassium', 277, 8, 7, 8, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁶ 7s²', [2, 8, 18, 32, 32, 14, 2], null, 7.6, '1984', 'Reacts with oxygen to form volatile tetroxide HsO₄, confirming its Group 8 homology with osmium.'],
  [109, 'Mt', 'Meitnerium', 278, 9, 7, 9, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁷ 7s²', [2, 8, 18, 32, 32, 15, 2], null, 8.0, '1982', 'Named in honor of physicist Lise Meitner, co-discoverer of nuclear fission and protactinium.'],
  [110, 'Ds', 'Darmstadtium', 281, 10, 7, 10, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁸ 7s²', [2, 8, 18, 32, 32, 16, 2], null, 9.6, '1994', 'Superheavy Group 10 noble transition metal synthesized by fusing nickel-62 with lead-208 ions.'],
  [111, 'Rg', 'Roentgenium', 282, 11, 7, 11, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d⁹ 7s²', [2, 8, 18, 32, 32, 17, 2], null, 10.6, '1994', 'Named after Wilhelm Röntgen; extreme relativistic effects invert its 6d and 7s orbital energies compared to gold.'],
  [112, 'Cn', 'Copernicium', 285, 12, 7, 12, 7, 'transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s²', [2, 8, 18, 32, 32, 18, 2], null, 11.97, '1996', 'Relativistic stabilization of its closed 7s² shell makes Copernicium a volatile liquid or gas-like metal at room temperature.'],
  [113, 'Nh', 'Nihonium', 286, 13, 7, 13, 7, 'post-transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', [2, 8, 18, 32, 32, 18, 3], null, 7.306, '2004', 'First element discovered in Asia (RIKEN, Japan), opening the 7p block of the periodic table.'],
  [114, 'Fl', 'Flerovium', 289, 14, 7, 14, 7, 'post-transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', [2, 8, 18, 32, 32, 18, 4], null, 8.539, '1999', 'Located near the theoretical Island of Stability (Z = 114, N = 184) with quasi-closed spin-orbit 7p₁/₂² subshell.'],
  [115, 'Mc', 'Moscovium', 290, 15, 7, 15, 7, 'post-transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', [2, 8, 18, 32, 32, 18, 5], null, 5.58, '2003', 'Superheavy pnictogen synthesized via calcium-48 bombardment of americium-243 targets.'],
  [116, 'Lv', 'Livermorium', 293, 16, 7, 16, 7, 'post-transition-metal', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', [2, 8, 18, 32, 32, 18, 6], null, 6.8, '2000', 'Superheavy chalcogen homolog of polonium, exhibiting strong spin-orbit splitting in its 7p valence shell.'],
  [117, 'Ts', 'Tennessine', 294, 17, 7, 17, 7, 'halogen', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', [2, 8, 18, 32, 32, 18, 7], null, 7.7, '2010', 'Second-heaviest known element; relativistic effects give it metalloid-like traits rather than typical halogen volatility.'],
  [118, 'Og', 'Oganesson', 294, 18, 7, 18, 7, 'noble-gas', 'synthetic', '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', [2, 8, 18, 32, 32, 18, 8], null, 8.888, '2002', 'Culmination of the 7th period; relativistic electron Fermi-gas blurring makes Oganesson a polarizable solid semiconductor.'],
];

export const ELEMENTS: ChemicalElement[] = RAW_ELEMENTS.map((row) => {
  const [
    number,
    symbol,
    name,
    mass,
    group,
    period,
    gridCol,
    gridRow,
    category,
    state,
    electronConfig,
    shells,
    electronegativity,
    ionizationEnergyEv,
    discoveryYear,
    summary,
  ] = row;
  return {
    number,
    symbol,
    name,
    mass,
    group,
    period,
    gridCol,
    gridRow,
    category,
    state,
    electronConfig,
    shells,
    electronegativity,
    ionizationEnergyEv,
    discoveryYear,
    spectralLines: generateSpectrumForElement(number, category),
    summary,
  };
});

export const ELEMENT_BY_NUMBER: Record<number, ChemicalElement> = Object.fromEntries(
  ELEMENTS.map((el) => [el.number, el])
);
