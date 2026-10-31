import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Volume2,
  X,
} from 'lucide-react';
import {
  CATEGORY_META,
  ChemicalElement,
  ELEMENT_BY_NUMBER,
} from '../data/elements';
import {
  fetchElementPubChemData,
  PubChemElementRecord,
} from '../utils/chemistryLogic';

interface DetailInspectorProps {
  element: ChemicalElement | null;
  visible: boolean;
  beatPulse: number;
  isMobileSheetExpanded: boolean;
  onToggleMobileSheet: (expanded: boolean) => void;
  onClose: () => void;
  onSelectElementNumber: (num: number) => void;
  onPlayElementTone: (element: ChemicalElement) => void;
}

const SHELL_LABELS = [
  'K Shell (n=1)',
  'L Shell (n=2)',
  'M Shell (n=3)',
  'N Shell (n=4)',
  'O Shell (n=5)',
  'P Shell (n=6)',
  'Q Shell (n=7)',
];

export const DetailInspector: React.FC<DetailInspectorProps> = ({
  element,
  visible,
  beatPulse,
  isMobileSheetExpanded,
  onToggleMobileSheet,
  onClose,
  onSelectElementNumber,
  onPlayElementTone,
}) => {
  const [revealStage, setRevealStage] = useState<number>(4);
  const [openAccordion, setOpenAccordion] = useState<
    'spectrum' | 'shells' | 'pubchem' | null
  >('spectrum');
  const [spectrumMode, setSpectrumMode] = useState<'emission' | 'absorption'>(
    'emission'
  );
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [pubchemData, setPubchemData] = useState<PubChemElementRecord | null>(null);
  const [loadingPubchem, setLoadingPubchem] = useState(false);

  const touchStartYRef = useRef<number | null>(null);

  // Scene 4 Progressive Science Reveal sequence (1 -> 2 -> 3 -> 4)
  useEffect(() => {
    if (!element || !visible) return;
    setRevealStage(1);
    const t1 = window.setTimeout(() => setRevealStage(2), 180);
    const t2 = window.setTimeout(() => setRevealStage(3), 380);
    const t3 = window.setTimeout(() => setRevealStage(4), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [element?.number, visible]);

  useEffect(() => {
    if (!element) {
      setPubchemData(null);
      setActiveLineIdx(null);
      return;
    }
    let cancelled = false;
    setLoadingPubchem(true);
    fetchElementPubChemData(element)
      .then((res) => {
        if (!cancelled) {
          setPubchemData(res);
          setLoadingPubchem(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingPubchem(false);
      });
    return () => {
      cancelled = true;
    };
  }, [element]);

  if (!element || !visible) return null;

  const meta = CATEGORY_META[element.category];
  const prevNum = element.number > 1 ? element.number - 1 : 118;
  const nextNum = element.number < 118 ? element.number + 1 : 1;
  const prevEl = ELEMENT_BY_NUMBER[prevNum];
  const nextEl = ELEMENT_BY_NUMBER[nextNum];
  const inspectedLine =
    activeLineIdx !== null
      ? element.spectralLines[activeLineIdx]
      : element.spectralLines[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current;
    if (deltaY > 36) {
      // Swipe down collapses mobile bottom sheet
      onToggleMobileSheet(false);
    } else if (deltaY < -36) {
      // Swipe up expands mobile bottom sheet
      onToggleMobileSheet(true);
    }
    touchStartYRef.current = null;
  };

  return (
    <aside
      aria-label={`Element details for ${element.name}`}
      className={`fixed z-20 flex flex-col bg-[#070c1e]/96 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden transition-all duration-300
        left-0 right-0 bottom-0 rounded-t-2xl md:left-auto md:right-4 md:top-20 md:bottom-24 md:w-[356px] md:max-w-[360px] md:rounded-2xl
        ${isMobileSheetExpanded ? 'max-h-[60vh] md:max-h-none' : 'max-h-[152px] md:max-h-none'}
      `}
    >
      {/* Top Category Accent Bar */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: meta.color }}
      />

      {/* Mobile Drag / Tap Handle */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="md:hidden flex items-center justify-between px-4 pt-2 pb-1 bg-[#091028] border-b border-slate-800/80 shrink-0"
      >
        <button
          type="button"
          onClick={() => onToggleMobileSheet(!isMobileSheetExpanded)}
          aria-expanded={isMobileSheetExpanded}
          aria-label="Toggle element details sheet"
          className="flex-1 flex items-center gap-2 min-h-[44px] text-left text-[15px] font-medium text-sky-300 cursor-pointer"
        >
          {isMobileSheetExpanded ? (
            <>
              <ChevronDown className="w-5 h-5 shrink-0" />
              <span>Collapse Atom Sheet</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-5 h-5 shrink-0" />
              <span>Expand Science & Spectrum</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close element detail panel"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stage 1 & 2: Hero Symbol (>= 64px), Element Name, Atomic Number & Category */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/80 shrink-0"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* >= 64px Element Symbol Display */}
          <div
            className="text-[64px] leading-none font-bold font-display tracking-tight shrink-0 select-none"
            style={{ color: meta.color }}
          >
            {element.symbol}
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-bold font-display text-white tracking-tight truncate">
              {element.name}
            </h2>
            <div
              className={`text-[14px] text-slate-300 mt-0.5 transition-opacity duration-300 ${
                revealStage >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span className="font-mono-tabular font-semibold text-white">
                #{element.number}
              </span>
              <span aria-hidden="true"> · </span>
              <span style={{ color: meta.secondaryColor }}>{meta.label}</span>
              <span aria-hidden="true"> · </span>
              <span className="capitalize">{element.state}</span>
            </div>
          </div>
        </div>

        {/* Desktop Action Buttons (44px+ touch targets) */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPlayElementTone(element)}
            aria-label={`Play spectral audio tone for ${element.name}`}
            title="Play Elemental Harmonic Tone"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-slate-700/70 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close element detail panel"
            title="Close (Esc)"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Progressive Science Content (hidden on mobile when sheet is collapsed so text never clips) */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-3.5 space-y-4 text-[15px] ${
          isMobileSheetExpanded ? 'block' : 'hidden md:block'
        }`}
      >
        {/* Stage 3: Single-Row-Per-Metric Essential Science (Never dense multi-column on mobile) */}
        <div
          className={`space-y-2 transition-all duration-300 ${
            revealStage >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <p className="text-[15px] text-slate-200 leading-relaxed">
            {element.summary}
          </p>

          <div className="divide-y divide-slate-800/90 bg-[#0b1228] rounded-xl border border-slate-800/90 px-3.5 py-1">
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-slate-400">Electron Configuration</span>
              <span className="font-mono-tabular font-semibold text-sky-300">
                {element.electronConfig}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-slate-400">Atomic Mass</span>
              <span className="font-mono-tabular font-semibold text-white">
                {element.mass} u
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-slate-400">Group & Period</span>
              <span className="font-mono-tabular font-semibold text-white">
                Group {element.group ?? 'f-block'} · Period {element.period}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-slate-400">Ionization Energy</span>
              <span className="font-mono-tabular font-semibold text-white">
                {element.ionizationEnergyEv.toFixed(2)} eV
              </span>
            </div>
          </div>
        </div>

        {/* Stage 4: Expandable Accordions for Emission Spectrum, Orbital Shells & Live PubChem Data */}
        <div
          className={`space-y-2.5 transition-all duration-300 ${
            revealStage >= 4
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          {/* Accordion 1: Optical Emission Spectrum */}
          <div className="rounded-xl bg-[#0b1228] border border-slate-800/90 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenAccordion(openAccordion === 'spectrum' ? null : 'spectrum')
              }
              aria-expanded={openAccordion === 'spectrum'}
              className="w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between text-left text-[15px] font-semibold text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span>Optical Emission Spectrum</span>
              {openAccordion === 'spectrum' ? (
                <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {openAccordion === 'spectrum' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">380–750 nm Band</span>
                  <div className="flex items-center gap-1 bg-[#070c1e] p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSpectrumMode('emission')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        spectrumMode === 'emission'
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Emission
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpectrumMode('absorption')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        spectrumMode === 'absorption'
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Absorption
                    </button>
                  </div>
                </div>

                <div
                  className="relative h-14 rounded-lg overflow-hidden border border-slate-700/80"
                  style={{
                    background:
                      spectrumMode === 'emission'
                        ? '#030612'
                        : 'linear-gradient(90deg, #6b21a8 0%, #2563eb 22%, #06b6d4 40%, #22c55e 56%, #eab308 74%, #ef4444 92%, #7f1d1d 100%)',
                  }}
                >
                  {element.spectralLines.map((line, idx) => {
                    const leftPct = Math.max(
                      3,
                      Math.min(97, ((line.wavelengthNm - 380) / 370) * 100)
                    );
                    const isSelectedLine = activeLineIdx === idx;
                    const pulseScale = 0.85 + beatPulse * 0.25;
                    return (
                      <button
                        key={`${line.wavelengthNm}-${idx}`}
                        type="button"
                        onClick={() => setActiveLineIdx(idx)}
                        onMouseEnter={() => setActiveLineIdx(idx)}
                        aria-label={`Spectral line at ${line.wavelengthNm} nanometers`}
                        style={{
                          left: `${leftPct}%`,
                          backgroundColor:
                            spectrumMode === 'emission' ? line.color : '#020617',
                          opacity:
                            spectrumMode === 'emission'
                              ? Math.min(1, line.intensity * pulseScale + 0.25)
                              : 0.92,
                          boxShadow:
                            spectrumMode === 'emission'
                              ? `0 0 ${isSelectedLine ? 12 : 6}px ${line.color}`
                              : 'none',
                        }}
                        className={`absolute top-0 bottom-0 -translate-x-1/2 transition-transform cursor-pointer ${
                          isSelectedLine ? 'w-2 z-10' : 'w-1.5 hover:w-2'
                        }`}
                      />
                    );
                  })}
                </div>

                {inspectedLine && (
                  <div className="text-xs font-mono-tabular text-slate-300 flex items-center justify-between">
                    <span>Wavelength: {inspectedLine.wavelengthNm} nm</span>
                    <span>
                      Relative Intensity: {Math.round(inspectedLine.intensity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Quantum Electron Shells (K, L, M, N, O, P, Q) */}
          <div className="rounded-xl bg-[#0b1228] border border-slate-800/90 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenAccordion(openAccordion === 'shells' ? null : 'shells')
              }
              aria-expanded={openAccordion === 'shells'}
              className="w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between text-left text-[15px] font-semibold text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span>Quantum Orbital Shells ({element.shells.length})</span>
              {openAccordion === 'shells' ? (
                <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {openAccordion === 'shells' && (
              <div className="px-3.5 pb-3 pt-1 divide-y divide-slate-800/70 border-t border-slate-800/80">
                {element.shells.map((count, sIdx) => (
                  <div
                    key={SHELL_LABELS[sIdx]}
                    className="py-1.5 flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-300">{SHELL_LABELS[sIdx]}</span>
                    <span
                      className="font-mono-tabular font-semibold"
                      style={{ color: meta.secondaryColor }}
                    >
                      {count} electrons
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accordion 3: Live NCBI PubChem Chemical Reference */}
          <div className="rounded-xl bg-[#0b1228] border border-slate-800/90 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenAccordion(openAccordion === 'pubchem' ? null : 'pubchem')
              }
              aria-expanded={openAccordion === 'pubchem'}
              className="w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between text-left text-[15px] font-semibold text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span>NCBI PubChem Reference</span>
              {openAccordion === 'pubchem' ? (
                <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {openAccordion === 'pubchem' && (
              <div className="px-3.5 pb-3.5 pt-2 space-y-2 border-t border-slate-800/80 text-sm">
                <div className="text-xs font-mono-tabular text-sky-400">
                  {loadingPubchem
                    ? 'Querying NCBI PUG-REST...'
                    : pubchemData?.sourceStatus === 'live'
                    ? 'Experimentally determined · Live API'
                    : 'Curated IUPAC Standard'}
                </div>
                {pubchemData && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">IUPAC Formula</span>
                      <span className="font-mono-tabular text-white">
                        {pubchemData.iupacName} ({pubchemData.molecularFormula})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">PubChem Record</span>
                      <span className="font-mono-tabular text-white">
                        {pubchemData.cid
                          ? `CID ${pubchemData.cid}`
                          : `Element Z=${element.number}`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 pt-1">
                      Synonyms: {pubchemData.synonyms.slice(0, 4).join(' · ')}
                    </div>
                    <div className="pt-1">
                      <a
                        href={pubchemData.pubchemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300"
                      >
                        <span>View on NCBI PubChem</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Prev / Next Element Navigation (44px+ touch targets) */}
      <div className="px-4 py-2.5 bg-[#050918] border-t border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onSelectElementNumber(prevNum)}
          aria-label={`Previous element ${prevEl.name}`}
          className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-[15px] font-medium text-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-mono-tabular text-slate-400">#{prevEl.number}</span>
          <span>{prevEl.symbol}</span>
        </button>

        <button
          type="button"
          onClick={() => onPlayElementTone(element)}
          aria-label={`Play harmonic tone for ${element.name}`}
          className="md:hidden min-h-[44px] px-3 py-2 rounded-xl bg-slate-800/90 text-sky-300 flex items-center gap-1.5 text-[15px] font-medium cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tone</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectElementNumber(nextNum)}
          aria-label={`Next element ${nextEl.name}`}
          className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-[15px] font-medium text-slate-100 transition-colors cursor-pointer"
        >
          <span>{nextEl.symbol}</span>
          <span className="font-mono-tabular text-slate-400">#{nextEl.number}</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </aside>
  );
};
