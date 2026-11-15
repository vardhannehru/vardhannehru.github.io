import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import AboutCollage from './AboutCollage';
import CertificateDrawer from '../certificates/CertificateDrawer';

interface AboutSectionProps {
  isDark: boolean;
}

// Your resume PDF, served from the project's public folder.
const RESUME_URL = "/about/resume.pdf";

// The About section: the collage page, then the certifications in a 3D filing-cabinet drawer that opens as you
// scroll and hands out the certificates (CertificateDrawer).
const AboutSection = forwardRef<HTMLElement, AboutSectionProps>((_props, ref) => {
  return (
    // data-pencil-zone: the cursor becomes a 3D pencil here (components/about/pencil/PencilCursor.tsx).
    <section
      id="about"
      ref={ref}
      data-pencil-zone
      className={cn(
        "relative w-full",
        // Force pure black background in dark mode (kills any underlying glow). Summer Green in the pastel theme.
        "bg-[#07040f] pastel-green"
      )}
      // Clipped sideways only (not overflow-hidden): hidden overflow would stop the drawer pinning as you scroll.
      style={{ overflowX: 'clip' }}
    >
      <AboutCollage resumeUrl={RESUME_URL} />

      <div className="w-full pb-32 pt-16 md:pt-24 relative z-10">
        <CertificateDrawer />
      </div>
    </section>
  );
});

export default AboutSection;
