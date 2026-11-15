import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Shown for any address the site doesn't have (the catch-all route in App.tsx).
export default function NotFoundPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    const before = document.title;
    document.title = 'Page not found';
    return () => {
      document.title = before;
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-32 text-center">
      {/* Soft glow behind the number */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#743BBE]/25 blur-[120px]"
      />
      <p
        aria-hidden="true"
        className="relative bg-gradient-to-b from-white to-[#a78bfa] bg-clip-text text-[120px] font-bold leading-none tracking-tight text-transparent md:text-[200px]"
      >
        404
      </p>
      <h1 className="relative mt-4 text-2xl font-semibold text-white md:text-4xl">This page doesn't exist</h1>
      <p className="relative mt-4 max-w-md text-zinc-400">
        Nothing lives at <span className="break-all font-mono text-zinc-300">{pathname}</span>. The link may be old or
        mistyped.
      </p>
      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#07040f] transition-transform hover:scale-[1.03]"
        >
          Back to the home page
        </Link>
        <Link
          to="/work"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          See my work
        </Link>
      </div>
    </section>
  );
}
