// A certificate opened full size, over the page: the picture, what it is, and arrows to step through them.
// Used by the certifications drawer (CertificateDrawer.tsx).
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CERTIFICATES } from './certificates';

const MONO = "'Bricolage Grotesque', 'Geist', sans-serif";

/** The certificate full size, with its details. Drawn into the page body so nothing clips it. Also used by CertificateStack. */
export function Viewer({ index, onClose, onStep }: { index: number | null; onClose: () => void; onStep: (d: number) => void }) {
  useEffect(() => {
    if (index === null) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose, onStep]);

  const c = index === null ? null : CERTIFICATES[index];
  const btn =
    'grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-[#c8b6ff] hover:text-white';
  return createPortal(
    <AnimatePresence>
      {c && index !== null && (
        <motion.div
          key="viewer"
          role="dialog"
          aria-modal="true"
          aria-label={c.title}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[#07040f]/90 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.figure
            className="relative w-full max-w-4xl"
            initial={{ y: 30, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-[#f4efe6] p-2 shadow-[0_40px_90px_rgba(0,0,0,0.6)] md:p-3">
              <AnimatePresence mode="wait">
                <motion.img
                  key={c.id}
                  src={c.full}
                  alt={c.title}
                  className="mx-auto block max-h-[68vh] w-full rounded-xl object-contain"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22 }}
                />
              </AnimatePresence>
            </div>
            <figcaption className="mt-4 flex flex-wrap items-end justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="text-[12px] font-medium tracking-[-0.01em] text-white/45" style={{ fontFamily: MONO }}>
                  {String(index + 1).padStart(2, '0')} / {String(CERTIFICATES.length).padStart(2, '0')}
                </p>
                <p className="mt-1 text-lg font-semibold md:text-xl">{c.title}</p>
                <p className="text-sm text-white/60">
                  {c.issuer} · {c.date}
                  {c.credential ? ` · ID ${c.credential}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.verify && (
                  <a
                    href={c.verify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#c8b6ff] px-4 py-2 text-sm font-bold text-[#07040f] transition-transform hover:scale-105"
                  >
                    Verify ↗
                  </a>
                )}
                <button type="button" aria-label="Previous certificate" className={btn} onClick={() => onStep(-1)}>
                  ←
                </button>
                <button type="button" aria-label="Next certificate" className={btn} onClick={() => onStep(1)}>
                  →
                </button>
                <button type="button" aria-label="Close" className={btn} onClick={onClose}>
                  ×
                </button>
              </div>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
