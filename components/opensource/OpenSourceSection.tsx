import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { MONO, ACCENT } from '../work/projects';
import CustomIcon from '../icons/CustomIcon';
import LinkedinIcon from '../icons/LinkedinIcon';

// Open source contributions: pull requests to other people's repositories (found with a GitHub search for
// `author:vardhannehru type:pr -user:vardhannehru`). Add new ones to the top of CONTRIBUTIONS.

export const GITHUB_URL = 'https://github.com/vardhannehru';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/pvsr-nehru/';

type Status = 'merged' | 'open' | 'closed';

type Contribution = {
  repo: string; // owner/name
  repoAbout: string; // what the project is, in a few words
  title: string;
  pr: number;
  status: Status;
  statusNote?: string; // why it was closed, if it was
  date: string;
  summary: string;
  tags: string[];
};

const CONTRIBUTIONS: Contribution[] = [
  {
    repo: 'pipecat-ai/pipecat',
    repoAbout: 'Open-source framework for real-time voice and multimodal AI agents',
    title: 'Unit tests for SoundfileMixer',
    pr: 5864,
    status: 'merged',
    date: 'Sep 2026',
    summary:
      'The audio mixer module had no tests. Added a suite covering sound-file loading (wrong sample rates, missing files), mixing at the set volume with int16 clipping, looping and passthrough, and live settings updates. Revised after maintainer review.',
    tags: ['Python', 'pytest', 'Audio'],
  },
  {
    repo: 'stripe/ai',
    repoAbout: "Stripe's agent toolkit for LLM tool use",
    title: "Warn on the deprecated 'actions' config key",
    pr: 559,
    status: 'closed',
    statusNote: 'Closed: Stripe retired the package',
    date: 'Oct 2026',
    summary:
      "In v0.7 the old 'actions' key was silently ignored, so tool restrictions people thought were on were off. Added config validation that raises a deprecation warning for it and flags unknown keys, with tests.",
    tags: ['Python', 'Security', 'Agents'],
  },
  {
    repo: 'stripe/ai',
    repoAbout: "Stripe's agent toolkit for LLM tool use",
    title: 'Run all 51 Python tests, not 3',
    pr: 560,
    status: 'closed',
    statusNote: 'Closed: Stripe retired the package',
    date: 'Oct 2026',
    summary:
      "The test command used unittest discovery, which silently skipped 48 of the 51 pytest-style tests. Switched it to pytest and added pytest-asyncio so the async tests run too.",
    tags: ['Python', 'Testing', 'CI'],
  },
];

const STATUS_STYLE: Record<Status, { label: string; color: string }> = {
  merged: { label: 'Merged', color: '#a78bfa' },
  open: { label: 'Open', color: '#4ade80' },
  closed: { label: 'Closed', color: 'rgba(255,255,255,0.45)' },
};

function Card({ c }: { c: Contribution }) {
  const s = STATUS_STYLE[c.status];
  const url = `https://github.com/${c.repo}/pull/${c.pr}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04] md:p-7"
    >
      <div className="flex items-center justify-between gap-3 text-[12px]" style={{ fontFamily: MONO }}>
        <span className="flex min-w-0 items-center gap-2 text-white/60">
          <CustomIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{c.repo}</span>
        </span>
        <span
          className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.15em]"
          style={{ color: s.color, borderColor: s.color }}
        >
          {s.label}
        </span>
      </div>
      <p className="mt-2 text-[13px] text-white/35">{c.repoAbout}</p>

      <h3 className="mt-5 flex items-start gap-2 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-white md:text-[22px]">
        <span className="[overflow-wrap:anywhere]">{c.title}</span>
        <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/70" />
      </h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/65">{c.summary}</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-white/40" style={{ fontFamily: MONO }}>
        <span style={{ color: ACCENT }}>#{c.pr}</span>
        <span>{c.date}</span>
        {c.statusNote && <span>· {c.statusNote}</span>}
        <span className="ml-auto flex gap-2">
          {c.tags.map((t) => (
            <span key={t} className="rounded border border-white/10 px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </span>
      </div>
    </a>
  );
}

/** GitHub and LinkedIn as labelled buttons. */
export function SocialLinks({ className = '' }: { className?: string }) {
  const btn =
    'inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/80 transition-colors hover:border-white/40 hover:text-white';
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={btn}>
        <CustomIcon className="h-4 w-4" /> GitHub
      </a>
      <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={btn}>
        <LinkedinIcon className="h-4 w-4" /> LinkedIn
      </a>
    </div>
  );
}

export default function OpenSourceSection() {
  return (
    <section id="open-source" className="container mx-auto max-w-5xl scroll-mt-24 px-4 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/40" style={{ fontFamily: MONO }}>
            Open source
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">Contributions</h2>
          <p className="mt-3 max-w-xl text-white/55">Pull requests to projects I use, from tests to config fixes.</p>
        </div>
        <SocialLinks />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {CONTRIBUTIONS.map((c) => (
          <Card key={`${c.repo}#${c.pr}`} c={c} />
        ))}
      </div>

      <a
        href="https://github.com/search?q=is%3Apr+author%3Avardhannehru+-user%3Avardhannehru&type=pullrequests"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-1 text-[13px] text-white/45 transition-colors hover:text-white"
        style={{ fontFamily: MONO }}
      >
        All my pull requests on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}
