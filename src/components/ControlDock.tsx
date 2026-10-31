import React, { useRef, useState } from 'react';
import {
  Compass,
  Music,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CATEGORY_META,
  ChemicalElement,
  ElementCategory,
  MatterState,
} from '../data/elements';
import {
  CINEMATIC_SCENES,
  CinematicSceneId,
  ExperienceMode,
  FilterCriteria,
  LayoutMode,
} from '../utils/chemistryLogic';
import { AudioPulseState } from '../utils/audioEngine';

interface ControlDockProps {
  experienceMode: ExperienceMode;
  cinematicScene: CinematicSceneId;
  journeyPaused: boolean;
  activeElement: ChemicalElement;
  selectedElement: ChemicalElement | null;
  layoutMode: LayoutMode;
  filterCriteria: FilterCriteria;
  matchedElements: ChemicalElement[];
  audioState: AudioPulseState;
  audioReactive: boolean;
  onStartJourney: () => void;
  onEnterExploreMode: () => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  onToggleJourneyPause: () => void;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onChangeFilter: (next: FilterCriteria) => void;
  onSelectElement: (element: ChemicalElement | null) => void;
  onResetView: () => void;
  onToggleAudioReactive: () => void;
  onToggleMute: () => void;
  onChangeBpm: (bpm: number) => void;
  onUploadAudioFile: (file: File) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  experienceMode,
  cinematicScene,
  journeyPaused,
  activeElement,
  selectedElement,
  layoutMode,
  filterCriteria,
  matchedElements,
  audioState,
  audioReactive,
  onStartJourney,
  onEnterExploreMode,
  onPrevScene,
  onNextScene,
  onToggleJourneyPause,
  onChangeLayoutMode,
  onChangeFilter,
  onSelectElement,
  onResetView,
  onToggleAudioReactive,
  onToggleMute,
  onChangeBpm,
  onUploadAudioFile,
}) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const categories = Object.values(CATEGORY_META);

  const currentSceneObj =
    CINEMATIC_SCENES.find((s) => s.id === cinematicScene) ?? CINEMATIC_SCENES[1];

  // ===========================================================================
  // SCENE 1: CINEMATIC OPENING UNIVERSE (`experienceMode === 'intro'`)
  // ===========================================================================
  if (experienceMode === 'intro') {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
        {/* Top Discreet Sound Toggle */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={audioState.isMuted ? 'Unmute sound' : 'Mute sound'}
            className="pointer-events-auto min-h-[44px] px-3.5 py-2 rounded-xl bg-[#070c1e]/90 border border-slate-700/80 text-slate-200 hover:text-white flex items-center gap-2 text-[15px] font-medium transition-colors cursor-pointer"
          >
            {audioState.isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span>Sound On</span>
              </>
            )}
          </button>
        </div>

        {/* Center / Lower-Third Hero Title & Primary CTA */}
        <div className="my-auto max-w-2xl mx-auto text-center px-6 py-9 rounded-3xl bg-[#040711]/92 border border-slate-800/90 shadow-2xl">
          <p className="text-xs sm:text-sm font-mono-tabular tracking-widest uppercase text-sky-400 mb-3">
            Explore the universe through the 118 elements
          </p>
          <h1 className="text-[30px] sm:text-5xl font-bold font-display tracking-tight text-white leading-tight text-balance">
            THE LIVING PERIODIC TABLE
          </h1>
          <p className="text-[16px] sm:text-lg text-slate-300 mt-3 max-w-xl mx-auto leading-relaxed">
            A cinematic journey through the building blocks of the universe
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5 pointer-events-auto">
            <button
              type="button"
              onClick={onStartJourney}
              className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-[16px] font-bold tracking-wide transition-transform active:scale-98 flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>BEGIN JOURNEY</span>
            </button>

            <button
              type="button"
              onClick={onEnterExploreMode}
              className="w-full sm:w-auto min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0b132b]/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Explore Mode</span>
            </button>
          </div>
        </div>

        <div className="h-4" />
      </div>
    );
  }

  // ===========================================================================
  // CINEMATIC JOURNEY HUD (`experienceMode === 'journey'`)
  // Only shows: Journey progress, Current element name, Back, Pause/Play, Skip, Minimal sound
  // ===========================================================================
  if (experienceMode === 'journey') {
    const activeMeta = CATEGORY_META[activeElement.category];
    return (
      <>
        {/* Top Minimal Journey Status Bar */}
        <header className="fixed top-0 left-0 right-0 z-20 px-4 py-3 bg-[#050814]/94 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-mono-tabular text-sky-400 truncate">
              Scene {currentSceneObj.stepNumber} of 5 · {currentSceneObj.title}
            </div>
            <div className="text-[16px] sm:text-lg font-bold font-display text-white truncate">
              #{activeElement.number} {activeElement.name} ({activeElement.symbol})
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={audioState.isMuted ? 'Unmute sound' : 'Mute sound'}
              className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 text-[15px] cursor-pointer"
            >
              {audioState.isMuted ? (
                <VolumeX className="w-4 h-4 text-amber-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-400" />
              )}
              <span className="hidden sm:inline">
                {audioState.isMuted ? 'Muted' : 'Sound'}
              </span>
            </button>

            <button
              type="button"
              onClick={onEnterExploreMode}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80 text-[15px] font-medium whitespace-nowrap cursor-pointer"
            >
              Explore Mode
            </button>
          </div>
        </header>

        {/* Scene 5 Spectral Finale Callout Banner */}
        {cinematicScene === 'scene5-spectral-finale' && (
          <div className="fixed top-20 left-4 right-4 sm:left-6 sm:right-auto z-10 pointer-events-none max-w-md bg-[#070c1e]/92 border border-slate-800/90 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="text-4xl font-bold font-display leading-none"
                style={{ color: activeMeta.color }}
              >
                {activeElement.symbol}
              </span>
              <div>
                <div className="text-base font-bold text-white">
                  {activeElement.name} · Emission Spectrum
                </div>
                <div className="text-xs font-mono-tabular text-slate-300">
                  Wavelengths:{' '}
                  {activeElement.spectralLines
                    .map((l) => `${l.wavelengthNm}nm`)
                    .join(' · ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Minimal Cinematic Journey Transport Bar */}
        <nav
          aria-label="Cinematic Journey Controls"
          className={`fixed left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(520px,92vw)] z-20 rounded-2xl bg-[#070c1e]/95 border border-slate-700/80 px-4 py-2 shadow-2xl flex items-center justify-between gap-2 ${
            cinematicScene === 'scene4-science-reveal'
              ? 'top-20 bottom-auto md:top-auto md:bottom-4'
              : 'bottom-4'
          }`}
        >
          {/* Scene Progress Dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {CINEMATIC_SCENES.slice(1).map((s) => {
              const active = s.id === cinematicScene;
              return (
                <div
                  key={s.id}
                  className={`h-2 rounded-full transition-all ${
                    active ? 'w-7 bg-sky-400' : 'w-2 bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onPrevScene}
              aria-label="Previous Scene"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-[15px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onToggleJourneyPause}
              aria-label={journeyPaused ? 'Resume Journey' : 'Pause Journey'}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-[15px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {journeyPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onNextScene}
              aria-label="Skip to Next Scene"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-[15px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span>Skip</span>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </>
    );
  }

  // ===========================================================================
  // EXPLORE MODE HUD (`experienceMode === 'explore'`)
  // Clean Top Bar + Single Floating Search/Filter Trigger + Compact Bottom Nav
  // ===========================================================================
  const activeFilterCount =
    (filterCriteria.query.trim() ? 1 : 0) +
    (filterCriteria.category !== 'all' ? 1 : 0) +
    (filterCriteria.state !== 'all' ? 1 : 0);

  return (
    <>
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-20 px-4 py-2.5 bg-[#050814]/94 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onResetView}
          className="text-left min-h-[44px] flex items-center cursor-pointer"
        >
          <span className="text-[18px] sm:text-xl font-bold font-display tracking-tight text-white whitespace-nowrap">
            The Living Periodic Table
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onStartJourney}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[15px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Return to Journey</span>
            <span className="sm:hidden">Journey</span>
          </button>

          <button
            type="button"
            onClick={onResetView}
            aria-label="Reset View"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-100 text-[15px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Reset View</span>
          </button>
        </div>
      </header>

      {/* Single Floating Search & Filters Button (Top-Left below header) */}
      <div className="fixed top-20 left-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsFilterModalOpen((v) => !v)}
          aria-expanded={isFilterModalOpen}
          className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#070c1e]/95 hover:bg-slate-800 border border-slate-700/80 text-white shadow-xl flex items-center gap-2 text-[15px] font-semibold cursor-pointer"
        >
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Search & Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-mono-tabular rounded-md bg-sky-500 text-slate-950 font-bold">
              {matchedElements.length}/118
            </span>
          )}
        </button>

        {selectedElement && (
          <button
            type="button"
            onClick={() => onSelectElement(null)}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 border border-slate-600/80 text-white shadow-xl flex items-center gap-1.5 text-[15px] font-medium cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>All 118 Elements</span>
          </button>
        )}
      </div>

      {/* Expandable Search, Filter, & Audio Settings Drawer */}
      {isFilterModalOpen && (
        <div
          role="dialog"
          aria-label="Search, Filters, and Audio Controls"
          className="fixed top-34 left-4 right-4 sm:right-auto sm:w-[400px] max-h-[calc(100vh-160px)] overflow-y-auto z-30 rounded-2xl bg-[#070c1e]/98 border border-slate-700 p-4 shadow-2xl space-y-4 text-[15px]"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h2 className="font-bold font-display text-lg text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              <span>Explore Elements & Audio</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              aria-label="Close Search and Filters"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="explore-search-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Search by Name, Symbol, or Atomic Number
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="explore-search-input"
                type="search"
                value={filterCriteria.query}
                onChange={(e) =>
                  onChangeFilter({ ...filterCriteria, query: e.target.value })
                }
                placeholder="e.g. Gold, Au, 79, Carbon..."
                className="w-full min-h-[46px] pl-10 pr-9 py-2 text-[15px] bg-[#0c142c] border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
              />
              {filterCriteria.query && (
                <button
                  type="button"
                  onClick={() => onChangeFilter({ ...filterCriteria, query: '' })}
                  aria-label="Clear search"
                  className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick clickable results list */}
            <div className="max-h-40 overflow-y-auto rounded-xl bg-[#0b132b] border border-slate-800 divide-y divide-slate-800/80 mt-2">
              {matchedElements.slice(0, 10).map((el) => (
                <button
                  key={el.number}
                  type="button"
                  onClick={() => {
                    onSelectElement(el);
                    setIsFilterModalOpen(false);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 text-left text-[15px] flex items-center justify-between hover:bg-slate-800 text-slate-100 cursor-pointer"
                >
                  <span>
                    <strong className="font-mono-tabular text-sky-300">
                      #{el.number} {el.symbol}
                    </strong>{' '}
                    — {el.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {CATEGORY_META[el.category].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label
              htmlFor="explore-category-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Chemical Category
            </label>
            <select
              id="explore-category-select"
              value={filterCriteria.category}
              onChange={(e) =>
                onChangeFilter({
                  ...filterCriteria,
                  category: e.target.value as ElementCategory | 'all',
                })
              }
              className="w-full min-h-[46px] px-3.5 py-2 text-[15px] bg-[#0c142c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="all">All 10 Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* State of Matter Filter */}
          <div className="space-y-1.5">
            <label
              htmlFor="explore-state-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              State of Matter
            </label>
            <select
              id="explore-state-select"
              value={filterCriteria.state}
              onChange={(e) =>
                onChangeFilter({
                  ...filterCriteria,
                  state: e.target.value as MatterState | 'all',
                })
              }
              className="w-full min-h-[46px] px-3.5 py-2 text-[15px] bg-[#0c142c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="solid">Solid</option>
              <option value="liquid">Liquid</option>
              <option value="gas">Gas</option>
              <option value="synthetic">Synthetic</option>
            </select>
          </div>

          {/* Audio-Reactive & Custom Audio Controls */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#0c142c] border border-slate-700 text-slate-200 flex items-center justify-center gap-2 text-[15px] font-medium cursor-pointer"
              >
                {audioState.isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-amber-400" />
                    <span>Sound Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    <span>Synth Active</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleAudioReactive}
                className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border text-[15px] font-medium cursor-pointer ${
                  audioReactive
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                    : 'bg-[#0c142c] border-slate-700 text-slate-400'
                }`}
              >
                Beat Pulse: {audioReactive ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="explore-bpm-slider"
                className="text-sm font-mono-tabular text-slate-300 shrink-0"
              >
                Tempo: {audioState.bpm} BPM
              </label>
              <input
                id="explore-bpm-slider"
                type="range"
                min={72}
                max={168}
                step={4}
                value={audioState.bpm}
                onChange={(e) => onChangeBpm(Number(e.target.value))}
                className="flex-1 accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadAudioFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0c142c] hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center gap-2 text-[15px] font-medium cursor-pointer"
              >
                {audioState.hasCustomAudio ? (
                  <>
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{audioState.customFileName}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Upload Custom Audio Track</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Bottom Navigation Bar (Hidden on mobile when an element bottom sheet is active so zero overlap occurs) */}
      <nav
        aria-label="3D Visualization Layout Switcher"
        className={`fixed bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-20 rounded-2xl bg-[#070c1e]/95 border border-slate-700/80 p-1.5 shadow-2xl flex items-center justify-center gap-1.5 ${
          selectedElement ? 'hidden md:flex' : 'flex'
        }`}
      >
        {(
          [
            { id: 'table', label: 'Periodic Table' },
            { id: 'gallery', label: '3D Atom Gallery' },
            { id: 'spectral', label: 'Spectral Mode' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              onSelectElement(null);
              onChangeLayoutMode(m.id);
            }}
            className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 text-[15px] font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
              layoutMode === m.id && !selectedElement
                ? 'bg-sky-400 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </>
  );
};
