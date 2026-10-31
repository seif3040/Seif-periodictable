/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_META,
  ChemicalElement,
  ELEMENT_BY_NUMBER,
  ELEMENTS,
} from './data/elements';
import {
  CINEMATIC_SCENES,
  CinematicSceneId,
  ExperienceMode,
  FilterCriteria,
  filterElements,
  getAdjacentElementNumber,
  getNextCinematicScene,
  JOURNEY_FEATURED_NUMBERS,
  LayoutMode,
} from './utils/chemistryLogic';
import { AudioPulseState, ElementalAudioEngine } from './utils/audioEngine';
import {
  HoveredElementInfo,
  PeriodicScene3D,
} from './components/PeriodicScene3D';
import { DetailInspector } from './components/DetailInspector';
import { ControlDock } from './components/ControlDock';

export default function App() {
  // Support ?autostart=1 to go directly to Explore Mode if desired, otherwise start in Scene 1 ('intro')
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'explore';
    }
    return 'intro';
  });

  const [cinematicScene, setCinematicScene] =
    useState<CinematicSceneId>('scene1-intro');
  const [journeyPaused, setJourneyPaused] = useState<boolean>(false);
  const [journeyFeatureIdx, setJourneyFeatureIdx] = useState<number>(5); // Default Gold #79 for Scene 3-5 showcase

  const [selectedElement, setSelectedElement] =
    useState<ChemicalElement | null>(null);
  const [focusedNumber, setFocusedNumber] = useState<number>(79); // Gold #79
  const [hoveredInfo, setHoveredInfo] = useState<HoveredElementInfo | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('table');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    query: '',
    category: 'all',
    state: 'all',
  });
  const [audioReactive, setAudioReactive] = useState<boolean>(true);
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] =
    useState<boolean>(false);
  const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);

  const audioEngine = useMemo(() => new ElementalAudioEngine(), []);
  const [audioState, setAudioState] = useState<AudioPulseState>({
    isPlaying: false,
    isMuted: false,
    bpm: 120,
    beatPhase: 0,
    beatPulse: 0,
    beatCount: 0,
    lowEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    hasCustomAudio: false,
    customFileName: null,
  });

  const matchedElements = useMemo(
    () => filterElements(ELEMENTS, filterCriteria),
    [filterCriteria]
  );

  // Automatic progression through Scenes 2 -> 3 -> 4 -> 5 during active Cinematic Journey
  useEffect(() => {
    if (experienceMode !== 'journey' || journeyPaused || isMobileSheetExpanded) return;
    const currentDef =
      CINEMATIC_SCENES.find((s) => s.id === cinematicScene) ??
      CINEMATIC_SCENES[1];

    const timer = window.setTimeout(() => {
      const nextScene = getNextCinematicScene(cinematicScene, 'next');
      setCinematicScene(nextScene);

      if (nextScene === 'scene2-flythrough') {
        // Advance to next featured journey element on cycle wrap
        setJourneyFeatureIdx((prev) => {
          const nextIdx = (prev + 1) % JOURNEY_FEATURED_NUMBERS.length;
          const nextNum = JOURNEY_FEATURED_NUMBERS[nextIdx];
          setFocusedNumber(nextNum);
          const el = ELEMENT_BY_NUMBER[nextNum];
          if (el) audioEngine.playElementSonification(el);
          return nextIdx;
        });
      } else if (nextScene === 'scene3-atom-focus') {
        const featNum = JOURNEY_FEATURED_NUMBERS[journeyFeatureIdx] ?? 79;
        const featEl = ELEMENT_BY_NUMBER[featNum] ?? ELEMENTS[78];
        setFocusedNumber(featEl.number);
        audioEngine.playElementSonification(featEl);
      }
    }, currentDef.durationSec * 1000);

    return () => clearTimeout(timer);
  }, [
    experienceMode,
    cinematicScene,
    journeyPaused,
    isMobileSheetExpanded,
    journeyFeatureIdx,
    audioEngine,
  ]);

  const handleStartJourney = useCallback(() => {
    setSelectedElement(null);
    setIsMobileSheetExpanded(false);
    setExperienceMode('journey');
    setCinematicScene('scene2-flythrough');
    setJourneyPaused(false);
    audioEngine.start();
    const firstEl =
      ELEMENT_BY_NUMBER[JOURNEY_FEATURED_NUMBERS[journeyFeatureIdx]] ??
      ELEMENTS[78];
    setFocusedNumber(firstEl.number);
    audioEngine.playElementSonification(firstEl);
  }, [audioEngine, journeyFeatureIdx]);

  const handleEnterExploreMode = useCallback(() => {
    audioEngine.pause();
    setExperienceMode('explore');
    setCinematicScene('scene2-flythrough');
  }, [audioEngine]);

  const handlePrevScene = useCallback(() => {
    const prev = getNextCinematicScene(cinematicScene, 'prev');
    setCinematicScene(prev);
  }, [cinematicScene]);

  const handleNextScene = useCallback(() => {
    const next = getNextCinematicScene(cinematicScene, 'next');
    setCinematicScene(next);
    if (next === 'scene3-atom-focus') {
      const featNum = JOURNEY_FEATURED_NUMBERS[journeyFeatureIdx] ?? 79;
      const featEl = ELEMENT_BY_NUMBER[featNum] ?? ELEMENTS[78];
      setFocusedNumber(featEl.number);
      audioEngine.playElementSonification(featEl);
    }
  }, [cinematicScene, journeyFeatureIdx, audioEngine]);

  const handleToggleJourneyPause = useCallback(() => {
    setJourneyPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) audioEngine.pause();
      else audioEngine.start();
      return nextPaused;
    });
  }, [audioEngine]);

  const handleSelectElement = useCallback(
    (el: ChemicalElement | null) => {
      if (el) {
        if (experienceMode !== 'explore') {
          setExperienceMode('explore');
          audioEngine.pause();
        }
        setSelectedElement(el);
        setFocusedNumber(el.number);
        setIsMobileSheetExpanded(false);
        setHoveredInfo(null);
        audioEngine.playElementSonification(el);
      } else {
        setSelectedElement(null);
        setIsMobileSheetExpanded(false);
      }
    },
    [experienceMode, audioEngine]
  );

  const handleSelectElementNumber = useCallback(
    (num: number) => {
      const target = ELEMENT_BY_NUMBER[num];
      if (target) {
        handleSelectElement(target);
      }
    },
    [handleSelectElement]
  );

  const handleHighlightJourneyElement = useCallback((el: ChemicalElement) => {
    setFocusedNumber(el.number);
  }, []);

  // Keyboard Accessibility: Escape closes detail panel, Arrow keys navigate, Enter selects
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (selectedElement) {
          e.preventDefault();
          setSelectedElement(null);
          setIsMobileSheetExpanded(false);
        }
        return;
      }

      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        e.preventDefault();
        const nextNum = getAdjacentElementNumber(focusedNumber, e.key);
        setFocusedNumber(nextNum);
        if (selectedElement) {
          const nextEl = ELEMENT_BY_NUMBER[nextNum];
          if (nextEl) {
            setSelectedElement(nextEl);
            audioEngine.playElementSonification(nextEl);
          }
        }
        return;
      }

      if (e.key === 'Enter' && experienceMode === 'explore') {
        e.preventDefault();
        const target = ELEMENT_BY_NUMBER[focusedNumber];
        if (target) {
          handleSelectElement(target);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    focusedNumber,
    selectedElement,
    experienceMode,
    audioEngine,
    handleSelectElement,
  ]);

  const handleResetView = useCallback(() => {
    setSelectedElement(null);
    setIsMobileSheetExpanded(false);
    setFilterCriteria({ query: '', category: 'all', state: 'all' });
    setResetCameraTrigger((c) => c + 1);
  }, []);

  const handleToggleMute = useCallback(() => {
    audioEngine.setMuted(!audioEngine.isMuted);
  }, [audioEngine]);

  const handleChangeBpm = useCallback(
    (bpm: number) => {
      audioEngine.setBpm(bpm);
    },
    [audioEngine]
  );

  const handleUploadAudioFile = useCallback(
    (file: File) => {
      audioEngine.loadCustomAudioFile(file);
    },
    [audioEngine]
  );

  const activeElement =
    selectedElement ?? ELEMENT_BY_NUMBER[focusedNumber] ?? ELEMENTS[78];

  const isInspectorVisible =
    (experienceMode === 'explore' && selectedElement !== null) ||
    (experienceMode === 'journey' && cinematicScene === 'scene4-science-reveal');

  return (
    <main
      data-mode={experienceMode}
      data-scene={cinematicScene}
      data-selected-element={selectedElement?.symbol ?? 'none'}
      className="relative w-screen h-screen overflow-hidden bg-[#040711] select-none"
    >
      {/* Full-Screen 3D WebGL Periodic Table, Giant Atom & Spectral Finale Stage */}
      <PeriodicScene3D
        experienceMode={experienceMode}
        cinematicScene={cinematicScene}
        selectedElement={selectedElement}
        focusedNumber={focusedNumber}
        layoutMode={layoutMode}
        filterCriteria={filterCriteria}
        audioReactive={audioReactive}
        audioEngine={audioEngine}
        isMobileSheetExpanded={isMobileSheetExpanded}
        resetCameraTrigger={resetCameraTrigger}
        onSelectElement={handleSelectElement}
        onHoverElement={setHoveredInfo}
        onAudioPulseUpdate={setAudioState}
        onHighlightJourneyElement={handleHighlightJourneyElement}
      />

      {/* Compact Hover Tooltip (Only on desktop when viewing the full periodic table) */}
      {experienceMode === 'explore' &&
        !selectedElement &&
        hoveredInfo && (
          <div
            role="tooltip"
            style={{
              transform: `translate3d(${Math.min(
                window.innerWidth - 230,
                Math.max(16, hoveredInfo.screenX + 16)
              )}px, ${Math.min(
                window.innerHeight - 130,
                Math.max(68, hoveredInfo.screenY - 24)
              )}px, 0)`,
            }}
            className="hidden md:block fixed top-0 left-0 z-30 pointer-events-none w-52 rounded-xl bg-[#070c1e]/95 border border-slate-700 p-3 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-tabular text-slate-400">
                #{hoveredInfo.element.number} · {hoveredInfo.element.mass} u
              </span>
              <span
                className="font-semibold"
                style={{
                  color: CATEGORY_META[hoveredInfo.element.category].secondaryColor,
                }}
              >
                {CATEGORY_META[hoveredInfo.element.category].label}
              </span>
            </div>
            <div className="text-base font-bold font-display text-white mt-0.5">
              {hoveredInfo.element.name} ({hoveredInfo.element.symbol})
            </div>
            <div className="text-[11px] font-mono-tabular text-sky-300 mt-1">
              {hoveredInfo.element.electronConfig}
            </div>
          </div>
        )}

      {/* Progressive Science Detail Inspector (Bottom Sheet on Mobile, Side Panel on Desktop) */}
      <DetailInspector
        element={activeElement}
        visible={isInspectorVisible}
        beatPulse={audioState.beatPulse}
        isMobileSheetExpanded={isMobileSheetExpanded}
        onToggleMobileSheet={setIsMobileSheetExpanded}
        onClose={() => {
          setSelectedElement(null);
          setIsMobileSheetExpanded(false);
          if (experienceMode === 'journey') {
            handleNextScene();
          }
        }}
        onSelectElementNumber={handleSelectElementNumber}
        onPlayElementTone={(el) => audioEngine.playElementSonification(el)}
      />

      {/* Mode-Aware Cinematic / Explore Control HUD */}
      <ControlDock
        experienceMode={experienceMode}
        cinematicScene={cinematicScene}
        journeyPaused={journeyPaused}
        activeElement={activeElement}
        selectedElement={selectedElement}
        layoutMode={layoutMode}
        filterCriteria={filterCriteria}
        matchedElements={matchedElements}
        audioState={audioState}
        audioReactive={audioReactive}
        onStartJourney={handleStartJourney}
        onEnterExploreMode={handleEnterExploreMode}
        onPrevScene={handlePrevScene}
        onNextScene={handleNextScene}
        onToggleJourneyPause={handleToggleJourneyPause}
        onChangeLayoutMode={setLayoutMode}
        onChangeFilter={setFilterCriteria}
        onSelectElement={handleSelectElement}
        onResetView={handleResetView}
        onToggleAudioReactive={() => setAudioReactive((v) => !v)}
        onToggleMute={handleToggleMute}
        onChangeBpm={handleChangeBpm}
        onUploadAudioFile={handleUploadAudioFile}
      />
    </main>
  );
}
