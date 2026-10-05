import React, { useState } from 'react';
import { ApexLogin } from './components/ApexLogin';
import { BrainView } from './components/BrainView';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'brain'>('login');
  const [userEmail, setUserEmail] = useState<string>('dan@apex.host');

  const handleEnterBrain = (email: string) => {
    setUserEmail(email);
    setCurrentView('brain');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#03040a] font-sans text-white">
      {/* View Switcher Bar (Discreet, in the corner) */}
      <div className="fixed top-3 right-4 z-40 flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-xl shadow-lg">
        <button
          onClick={() => setCurrentView('login')}
          className={`mono rounded-lg px-2.5 py-1 text-[11px] transition ${
            currentView === 'login'
              ? 'bg-white/20 text-white font-medium'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Login Page
        </button>
        <button
          onClick={() => setCurrentView('brain')}
          className={`mono rounded-lg px-2.5 py-1 text-[11px] transition ${
            currentView === 'brain'
              ? 'bg-white/20 text-white font-medium'
              : 'text-white/40 hover:text-white'
          }`}
        >
          The Brain
        </button>
      </div>

      {currentView === 'login' ? (
        <ApexLogin onEnterBrain={handleEnterBrain} />
      ) : (
        <BrainView
          userEmail={userEmail}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </div>
  );
}
