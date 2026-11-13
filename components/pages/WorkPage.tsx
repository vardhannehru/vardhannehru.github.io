import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { smoothScrollTo } from '../ui/SmoothScroll';
import { projects, Mockup, KindLabel, MONO, ACCENT, type Project } from '../work/projects';

// The Work page (/work): every project in full. The demo, an overview, what's notable about it, how it works,
// a closer look at its key idea (MCP, RAG...), and its stack and links. The home page only shows the demos.

const SANS = "'Geist', 'Inter', sans-serif";

/** Small uppercase mono heading, used for every sub-section. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] uppercase tracking-[0.25em] text-white/40" style={{ fontFamily: MONO }}>
      {children}
    </h4>
  );
}

function ProjectDetail({ project, index }: { project: Project; index: number }) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <section id={project.slug} className="scroll-mt-24 border-t border-white/[0.08] py-20 md:py-28">
      {/* Title row */}
      <div className="flex items-start justify-between gap-6">
        {/* min-w-0 and wrapping anywhere: a long one-word title (TomandJerry.ai) mustn't push the page wider than a phone. */}
        <div className="min-w-0">
          <KindLabel project={project} />
          <h2 className="mt-4 text-[clamp(2.25rem,11vw,3rem)] md:text-[88px] font-semibold leading-[0.92] tracking-[-0.04em] text-white [overflow-wrap:anywhere]">{project.title}</h2>
          <p className="mt-2 text-[20px] md:text-[28px] italic text-white/45" style={{ fontFamily: "'Ranade', Georgia, serif" }}>
            {project.subtitle}
          </p>
        </div>
        <span className="shrink-0 text-[56px] md:text-[120px] font-light leading-none text-transparent [-webkit-text-stroke:1px_var(--accent-35,rgba(200,182,255,0.35))]">{num}</span>
      </div>

      {/* Demo */}
      <div className="group mt-10 md:mt-14">
        <Mockup project={project} />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-16 md:mt-20 md:grid-cols-12 md:gap-12">
        {/* The write-up */}
        <div className="md:col-span-7">
          <Eyebrow>Overview</Eyebrow>
          <div className="mt-5 space-y-5">
            {project.overview.map((p) => (
              <p key={p.slice(0, 24)} className="text-[17px] md:text-[19px] leading-relaxed text-white/75">
                {p}
              </p>
            ))}
          </div>

          {project.highlights.length > 0 && (
            <div className="mt-16">
              <Eyebrow>What makes it work</Eyebrow>
              <ol className="mt-6 space-y-8">
                {project.highlights.map((h, i) => (
                  <li key={h.title} className="grid grid-cols-[2.5rem_1fr] gap-x-2">
                    <span className="pt-1 text-[12px]" style={{ fontFamily: MONO, color: ACCENT }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-[18px] font-semibold tracking-tight text-white">{h.title}</p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">{h.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {project.flow && (
            <div className="mt-16">
              <Eyebrow>{project.flow.title}</Eyebrow>
              {/* A thin line runs down the steps, with a glowing dot at each one. */}
              <ol className="relative mt-6 ml-[5px] border-l border-white/10">
                {project.flow.steps.map((s) => (
                  <li key={s.name} className="relative pb-7 pl-7 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[5px] top-[7px] h-[9px] w-[9px] rounded-full"
                      style={{ background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }}
                    />
                    <p className="text-[15px] font-semibold text-white" style={{ fontFamily: MONO }}>
                      {s.name}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-white/55">{s.note}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {project.spotlight && (
            <div className="mt-16">
              <Eyebrow>{project.spotlight.title}</Eyebrow>
              <p className="mt-5 text-[16px] leading-relaxed text-white/70">{project.spotlight.intro}</p>
              <dl className="mt-6 border-t border-white/[0.08]">
                {project.spotlight.items.map((it) => (
                  <div key={it.name} className="flex flex-col gap-1 border-b border-white/[0.08] py-3.5 md:flex-row md:items-baseline md:gap-6">
                    <dt className="text-[14px] md:w-56 md:shrink-0" style={{ fontFamily: MONO, color: ACCENT }}>
                      {it.name}
                    </dt>
                    <dd className="text-[15px] text-white/60">{it.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Core tech, stack and links. Stays in view beside the write-up on wide screens. */}
        {/* data-signal-avoid: the floating traffic light (components/signal) moves out of the way. */}
        <aside className="md:col-span-5 md:sticky md:top-28 md:self-start" data-signal-avoid>
          <Eyebrow>Core</Eyebrow>
          <ul className="mt-4 space-y-1">
            {project.core.map((t) => (
              <li
                key={t}
                className="text-[30px] md:text-[40px] font-semibold leading-tight tracking-[-0.02em]"
                style={{ color: ACCENT, textShadow: '0 0 28px var(--accent-35,rgba(200,182,255,0.35))' }}
              >
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <Eyebrow>Tech stack</Eyebrow>
            <dl className="mt-4 border-t border-white/[0.08]">
              {project.stack.map((s) => (
                <div key={s.layer} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-white/[0.08] py-3">
                  <dt className="pt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/40" style={{ fontFamily: MONO }}>
                    {s.layer}
                  </dt>
                  <dd className="text-[15px] text-white/85">{s.tech}</dd>
                </div>
              ))}
            </dl>
          </div>

          {project.credit && <p className="mt-8 text-[15px] italic text-white/50" style={{ fontFamily: "'Ranade', Georgia, serif" }}>{project.credit}</p>}

          <div className="mt-8 flex flex-col gap-3">
            {project.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-fit items-center gap-2 border-b border-white/20 pb-1 text-[15px] text-white transition-colors hover:border-[color:var(--accent,#c8b6ff)]"
              >
                {l.label}
                <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: ACCENT }}>
                  <path d="M3.5 10.5 10.5 3.5M5 3.5h5.5V9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function WorkPage() {
  const { hash, key } = useLocation();

  // Arriving from a card on the home page (/work#asha) lands on that project; otherwise start at the top. Runs on
  // every navigation (key), so pressing Work in the nav while on /work jumps back to the top too.
  useEffect(() => {
    const id = hash.replace('#', '');
    if (!id) {
      smoothScrollTo(0, { immediate: true });
      return;
    }
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) smoothScrollTo(el, { immediate: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [hash, key]);

  return (
    // data-remote-zone: the cursor is the TV remote across the whole page (RemoteCursor.tsx).
    <div className="relative px-5 pb-24 pt-28 md:px-12 md:pt-36" style={{ fontFamily: SANS }} data-remote-zone>
      <Link
        to="/"
        className="group inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.25em] text-white/45 transition-colors hover:text-white"
        style={{ fontFamily: MONO }}
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1" style={{ color: ACCENT }}>
          ←
        </span>
        Home
      </Link>

      <header className="mt-8 flex flex-col gap-10 md:mt-10 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[72px] md:text-[160px] font-semibold leading-[0.85] tracking-[-0.05em] text-white">
            Work<span style={{ color: ACCENT }}>.</span>
          </h1>
          <p className="mt-6 max-w-[40ch] text-[17px] md:text-[19px] leading-relaxed text-white/60">
            AI agents, RAG and real-time voice systems, and the websites I build. Each one with how it works and what it’s made of.
          </p>
        </div>
        {/* Jump to a project */}
        <nav aria-label="Projects" className="flex flex-col gap-2 md:items-end">
          {projects.map((p, i) => (
            <a
              key={p.slug}
              href={`#${p.slug}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(p.slug);
                if (el) smoothScrollTo(el);
                window.history.replaceState(null, '', `#${p.slug}`);
              }}
              className="group inline-flex items-baseline gap-3 text-[15px] text-white/70 transition-colors hover:text-white"
            >
              <span className="text-[11px]" style={{ fontFamily: MONO, color: ACCENT }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {p.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="mt-20 md:mt-28">
        {projects.map((p, i) => (
          <ProjectDetail key={p.slug} project={p} index={i} />
        ))}
      </div>
    </div>
  );
}
