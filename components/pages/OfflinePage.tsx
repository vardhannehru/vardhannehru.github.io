import { useEffect, useState } from 'react';

// Covers the site while the device has no internet connection, and lifts by itself when it comes back.
// (It can only appear once the site has loaded: a visit that starts with no connection never reaches the site.)
export default function OfflinePage() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Keep the page behind from scrolling while this is up.
  useEffect(() => {
    if (!offline) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [offline]);

  if (!offline) return null;

  const retry = () => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      if (navigator.onLine) setOffline(false);
    }, 900);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-title"
      aria-describedby="offline-text"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07040f] px-6 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#743BBE]/20 blur-[120px]"
      />
      {/* Wi-Fi symbol with a line through it */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="relative h-20 w-20 text-[#a78bfa]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
        <path d="M10.7 5.1A15 15 0 0 1 22 8.8" />
        <path d="M5 12.6a10 10 0 0 1 5.2-2.7" />
        <path d="M16.9 11.1A10 10 0 0 1 19 12.6" />
        <path d="M8.5 16.4a5 5 0 0 1 7 0" />
        <circle cx="12" cy="20" r="0.9" fill="currentColor" />
        <path d="M3 3l18 18" />
      </svg>
      <h1 id="offline-title" className="relative mt-8 text-2xl font-semibold text-white md:text-4xl">
        You're offline
      </h1>
      <p id="offline-text" className="relative mt-4 max-w-md text-zinc-400">
        Your internet connection dropped. The page will come back by itself as soon as you're connected again.
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={checking}
        className="relative mt-10 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#07040f] transition-transform hover:scale-[1.03] disabled:opacity-60"
      >
        {checking ? 'Checking…' : 'Try again'}
      </button>
    </div>
  );
}
