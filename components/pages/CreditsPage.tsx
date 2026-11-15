import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// /credits: who and what the site builds on: borrowed components, libraries, fonts, pictures and trademarks.
// Add a line here whenever something new from someone else goes into the site.

type Credit = { name: string; by: string; href?: string; note?: string };

const GROUPS: { title: string; intro?: string; items: Credit[] }[] = [
  {
    title: 'Components',
    intro: 'Interface pieces adapted from open-source collections.',
    items: [
      { name: 'Click Spark', by: 'React Bits by David Haz', href: 'https://reactbits.dev', note: 'The sparks when you click. MIT + Commons Clause license.' },
      { name: 'Smooth Cursor', by: 'Magic UI', href: 'https://magicui.design', note: 'The custom cursor. MIT license.' },
    ],
  },
  {
    title: 'Libraries',
    intro: 'The open-source code the site runs on.',
    items: [
      { name: 'React', by: 'Meta', href: 'https://react.dev', note: 'MIT license.' },
      { name: 'React Router', by: 'React Router team', href: 'https://reactrouter.com', note: 'MIT license.' },
      { name: 'Three.js', by: 'three.js authors', href: 'https://threejs.org', note: 'The 3D TV, drawer, traffic light, pencil and remote. MIT license.' },
      { name: 'GSAP', by: 'GreenSock / Webflow', href: 'https://gsap.com', note: 'Scroll animations. GSAP standard license.' },
      { name: 'Motion (Framer Motion)', by: 'Motion', href: 'https://motion.dev', note: 'MIT license.' },
      { name: 'Lenis', by: 'darkroom.engineering', href: 'https://lenis.darkroom.engineering', note: 'Smooth scrolling. MIT license.' },
      { name: 'Lucide', by: 'Lucide contributors', href: 'https://lucide.dev', note: 'Icons. ISC license.' },
      { name: 'Tailwind CSS', by: 'Tailwind Labs', href: 'https://tailwindcss.com', note: 'MIT license.' },
      { name: 'clsx & tailwind-merge', by: 'Luke Edwards; Dany Castillo', href: 'https://github.com/dcastil/tailwind-merge', note: 'Class name helpers. MIT license.' },
      { name: 'Vite', by: 'Vite team', href: 'https://vite.dev', note: 'Build tool. MIT license.' },
    ],
  },
  {
    title: 'Logos',
    items: [
      { name: 'Python, AWS, Microsoft Azure and Docker logos', by: 'Devicon', href: 'https://devicon.dev', note: 'The tool stickers in the hero. MIT license.' },
    ],
  },
];

export default function CreditsPage() {
  useEffect(() => {
    const before = document.title;
    document.title = 'Credits';
    window.scrollTo(0, 0);
    return () => {
      document.title = before;
    };
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-6 pb-32 pt-32 md:px-10 md:pt-40" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <h1 className="text-[56px] font-semibold leading-[0.9] tracking-[-0.04em] text-white md:text-[96px]">
        Credits<span style={{ color: 'var(--accent,#c8b6ff)' }}>.</span>
      </h1>
      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/60">
        This site is built on other people’s generous work. Thank you to everyone below.
      </p>

      {GROUPS.map((g) => (
        <div key={g.title} className="mt-16">
          <h2 className="border-b border-white/10 pb-3 text-[15px] font-semibold tracking-[-0.01em] text-white/80" style={{ fontFamily: "'Bricolage Grotesque', 'Geist', sans-serif" }}>
            {g.title}
          </h2>
          {g.intro && <p className="mt-3 text-[14px] text-white/45">{g.intro}</p>}
          <ul className="mt-2">
            {g.items.map((c) => (
              <li key={c.name} className="flex flex-col gap-1 border-b border-white/[0.06] py-4 md:flex-row md:items-baseline md:gap-6">
                <span className="text-[17px] font-medium text-white md:w-1/2">{c.name}</span>
                <span className="text-[14px] text-white/55 md:w-1/2">
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white">
                      {c.by}
                    </a>
                  ) : (
                    c.by
                  )}
                  {c.note && <span className="block text-white/40">{c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-16 border-t border-white/10 pt-6 text-[14px] leading-relaxed text-white/45">
        <p>
          Logos and names of OpenAI, Anthropic (Claude), Amazon Web Services, Microsoft Azure, Docker, Python, LangChain, ElevenLabs, the
          Model Context Protocol, GitHub and LinkedIn are trademarks of their owners. They appear only to show the tools I work with and don’t mean those companies
          endorse this site.
        </p>
        <Link to="/" className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">
          Back to the home page
        </Link>
      </div>
    </section>
  );
}
