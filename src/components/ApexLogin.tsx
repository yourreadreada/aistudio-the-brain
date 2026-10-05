import React, { useState, useRef, useEffect } from 'react';
import { Constellation, ConstellationMood } from './Constellation';
import { ApexLogo } from './ApexLogo';

interface ApexLoginProps {
  onEnterBrain: (userEmail: string) => void;
}

type AuthStep = 'email' | 'verify' | 'password';

export const ApexLogin: React.FC<ApexLoginProps> = ({ onEnterBrain }) => {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [codeSentAgain, setCodeSentAgain] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const mood: ConstellationMood = isEntering
    ? 'entering'
    : isTyping
    ? 'typing'
    : 'idle';

  const triggerHandoff = (finalEmail: string) => {
    setIsEntering(true);
    setTimeout(() => {
      onEnterBrain(finalEmail || 'dan@apex.host');
    }, 790);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isEntering) return;
    setErrorMessage(null);

    if (step === 'email') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid work email address.');
        return;
      }
      setIsLoading(true);

      // Simulate authentication check (just like apex.host /api/auth/check)
      setTimeout(() => {
        setIsLoading(false);
        const lower = email.toLowerCase();
        // If demo email or already registered, prompt for password; otherwise ask for verification code
        if (lower.includes('dan') || lower.includes('apex') || lower.includes('stripe')) {
          setStep('password');
        } else {
          setStep('verify');
        }
      }, 420);
    } else if (step === 'verify') {
      if (code.length < 6) {
        setErrorMessage('Enter the 6-digit verification code.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        triggerHandoff(email);
      }, 500);
    } else if (step === 'password') {
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        triggerHandoff(email);
      }, 450);
    }
  };

  const handleResendCode = () => {
    setCodeSentAgain(true);
    setTimeout(() => setCodeSentAgain(false), 4000);
  };

  const handleDemoBypass = () => {
    setEmail('dan@apex.host');
    triggerHandoff('dan@apex.host');
  };

  const headingText =
    step === 'email'
      ? 'Welcome to Apex'
      : step === 'verify'
      ? 'Create your account'
      : 'Enter your password';

  const subtitleText =
    step === 'email'
      ? 'Use your work email.'
      : step === 'verify'
      ? `We emailed a 6 digit code to ${email}. Enter it, then choose a password of at least 8 characters.`
      : email;

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#03040a]">
      {/* Interactive Constellation Canvas */}
      <Constellation mood={mood} />

      {/* Grid line ambient overlay from apex.host */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity ease-out [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]"
        style={{
          opacity: isEntering ? 0 : 0.16,
          transitionDuration: '420ms',
        }}
      />

      {/* Radial shadow backdrop behind form */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[460px] -translate-x-1/2 -translate-y-1/2 transition-opacity ease-out lg:left-[26%] lg:h-[440px] lg:w-[520px]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.68) 55%, rgba(5,5,5,0) 100%)',
          opacity: isEntering ? 0 : 1,
          transitionDuration: '294ms',
        }}
      />

      {/* Form Container */}
      <div className="relative flex min-h-[100svh] items-center justify-center px-6 lg:justify-start lg:px-[12%]">
        <div
          className="w-full max-w-[320px] transition-[opacity,transform] ease-out"
          style={{
            opacity: isEntering ? 0 : 1,
            transform: isEntering ? 'translateY(6px)' : 'none',
            transitionDuration: '420ms',
          }}
        >
          {/* Logo Mark */}
          <div
            className="rise mb-8 flex items-center gap-2.5 text-ink-faint"
            style={{ animationDelay: '120ms' }}
          >
            <ApexLogo size={15} />
            <span className="mono text-[13px]">APEX</span>
          </div>

          {/* Heading */}
          <h1
            className="rise text-[22px] leading-tight text-ink"
            style={{ animationDelay: '220ms' }}
          >
            {headingText}
          </h1>

          {/* Subtitle */}
          <p
            className="rise mono mt-2 text-[11px] text-ink-ghost"
            style={{ animationDelay: '300ms' }}
          >
            {subtitleText}
          </p>

          {/* Login Form */}
          <form
            className="rise mt-7 flex flex-col gap-3"
            style={{ animationDelay: '380ms' }}
            onSubmit={handleSubmit}
          >
            {step === 'email' ? (
              <input
                ref={inputRef}
                type="text"
                autoComplete="username"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-3.5 text-[16px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45 pointer-fine:py-3 pointer-fine:text-[15px]"
              />
            ) : (
              <>
                {step === 'verify' && (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6 digit code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    className="mono w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-3.5 text-[16px] tracking-[0.3em] text-ink outline-none backdrop-blur-md transition placeholder:tracking-normal placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45 pointer-fine:py-3 pointer-fine:text-[15px]"
                  />
                )}
                <input
                  ref={step === 'password' ? inputRef : undefined}
                  type="password"
                  autoComplete={step === 'verify' ? 'new-password' : 'current-password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="w-full rounded-xl border border-white/36 bg-black/30 px-3.5 py-3.5 text-[16px] text-ink outline-none backdrop-blur-md transition placeholder:text-ink-ghost focus:border-white/52 focus:bg-black/45 pointer-fine:py-3 pointer-fine:text-[15px]"
                />
              </>
            )}

            <button
              type="submit"
              disabled={
                isLoading ||
                (step === 'email'
                  ? !email
                  : !password || (step === 'verify' && code.length !== 6))
              }
              className="mono min-h-11 w-full rounded-xl bg-white/90 py-4 text-[12px] text-black transition hover:bg-white disabled:opacity-50 pointer-fine:min-h-0 pointer-fine:py-3"
            >
              {isLoading
                ? '…'
                : step === 'verify'
                ? 'Create account'
                : 'Continue'}
            </button>
          </form>

          {/* Error Message */}
          {errorMessage && (
            <p className="mono mt-3 text-[11px] text-rose-300/80">
              {errorMessage}
            </p>
          )}

          {/* Secondary Controls */}
          {step === 'verify' && (
            <button
              type="button"
              onClick={handleResendCode}
              className="mono mt-4 mr-4 text-[11px] text-white/40 transition hover:text-white/80"
            >
              {codeSentAgain ? 'Code sent again' : 'Send a new code'}
            </button>
          )}

          {step !== 'email' && (
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setPassword('');
                setCode('');
                setErrorMessage(null);
              }}
              className="mono mt-4 text-[11px] text-white/40 transition hover:text-white/80"
            >
              Use a different email
            </button>
          )}

          {/* Direct Demo Bypass to Test The Brain immediately */}
          <div className="mt-8 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={handleDemoBypass}
              className="mono flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[11px] text-white/60 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
            >
              <span>Explore The Brain directly</span>
              <span className="text-white/40">→</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
