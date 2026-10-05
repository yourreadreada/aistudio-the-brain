import React, { useState, useEffect } from 'react';
import { WelcomeView } from './components/WelcomeView';
import { BrainView } from './components/BrainView';

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'brain'>('welcome');
  const [userLabel, setUserLabel] = useState<string>('Local Developer');
  const [initialBrain, setInitialBrain] = useState<string>('coding');

  // Cinematic Warp Transition State
  const [isWarping, setIsWarping] = useState(false);
  const [veilActive, setVeilActive] = useState(false);
  const [brainRevealed, setBrainRevealed] = useState(false);

  const handleEnterBrain = (selectedBrain?: string, label?: string) => {
    if (selectedBrain) setInitialBrain(selectedBrain);
    if (label) setUserLabel(label);

    setIsWarping(true);

    // Phase 1: At 450ms into the burst, ramp up the ethereal celestial veil
    setTimeout(() => {
      setVeilActive(true);
    }, 450);

    // Phase 2: At 720ms, switch view to brain behind the dissolving flare
    setTimeout(() => {
      setCurrentView('brain');
      // Trigger smooth scale & opacity bloom for the brain
      requestAnimationFrame(() => {
        setBrainRevealed(true);
      });
    }, 720);

    // Phase 3: At 850ms, dissipate the veil flare gracefully
    setTimeout(() => {
      setVeilActive(false);
    }, 850);

    // Phase 4: Finalize transition
    setTimeout(() => {
      setIsWarping(false);
    }, 1600);
  };

  const handleSwitchToWelcome = () => {
    setBrainRevealed(false);
    setCurrentView('welcome');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#03040a] font-sans text-white overflow-hidden">
      {/* Discreet View Switcher on Welcome Page (Header embeds its own switcher) */}
      {currentView === 'welcome' && (
        <div className="fixed top-4 right-5 z-40 flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-xl shadow-lg">
          <div className="mono rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white">
            Welcome
          </div>
          <button
            onClick={() => handleEnterBrain()}
            className="mono rounded-lg px-2.5 py-1 text-[11px] text-white/50 transition hover:text-white"
          >
            The Brain
          </button>
        </div>
      )}

      {/* Primary Views with Cross-Fade Choreography */}
      <div className="relative h-screen w-screen">
        {currentView === 'welcome' ? (
          <WelcomeView onEnterBrain={handleEnterBrain} isEnteringExternal={isWarping} />
        ) : (
          <div
            className={`h-full w-full transition-all duration-1000 ease-out ${
              brainRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <BrainView
              userEmail={userLabel}
              initialBrainName={initialBrain}
              onSwitchToLogin={handleSwitchToWelcome}
            />
          </div>
        )}
      </div>

      {/* Celestial Warp Light Flare Bridge (Bridges burst peak to brain emergence smoothly) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-800 ease-out ${
          veilActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 62% 50%, rgba(255, 255, 255, 0.95) 0%, rgba(180, 205, 255, 0.75) 35%, rgba(127, 119, 221, 0.45) 60%, rgba(3, 4, 10, 0.9) 100%)',
        }}
      />
    </div>
  );
}
