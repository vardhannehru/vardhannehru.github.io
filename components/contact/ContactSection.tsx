import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LightSwitch, TubeLight, useTubeFlicker } from './TubeLight';
import { PixelContact } from './PixelContact';
import MailIcon from '../icons/MailIcon';
import LinkedinIcon from '../icons/LinkedinIcon';
import CustomIcon from '../icons/CustomIcon';

interface ContactSectionProps {
  contact: ContactInfo;
  isDark: boolean;
}

// Dark theme: an old fluorescent tube on a wall over the heading (TubeLight.tsx, contactLight.css), which flickers
// now and then and has a wall switch (it strikes again each time it comes on). Light theme: a pixel arcade with
// Pac-Man chasing pellets under the heading (PixelContact.tsx, pixelContact.css).
const ContactSection = forwardRef<HTMLElement, ContactSectionProps>(({ contact, isDark }, ref): React.ReactElement => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [lightOn, setLightOn] = useState(true);
  useTubeFlicker(stageRef, isDark && lightOn);

  // Dark theme: while the section is under the fixed header (its top ~12% of the screen), mark <html> so the
  // theme switch can fade out over the black (contactLight.css).
  useEffect(() => {
    if (!isDark) return;
    // The whole black band when the page has one (home page), else the stage.
    const el = stageRef.current?.closest<HTMLElement>('.contact-band') ?? stageRef.current;
    if (!el) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(([e]) => root.classList.toggle('over-contact', e.isIntersecting), {
      rootMargin: '0px 0px -88% 0px',
    });
    io.observe(el);
    return () => {
      io.disconnect();
      root.classList.remove('over-contact');
    };
  }, [isDark]);

  if (!isDark) {
    return (
      <section id="contact" ref={ref}>
        <PixelContact contact={contact} />
      </section>
    );
  }

  return (
    <section id="contact" ref={ref}>
      <div ref={stageRef} className="contact-stage" data-light={lightOn ? 'on' : 'off'}>
        <TubeLight />
        <LightSwitch on={lightOn} onToggle={() => setLightOn((v) => !v)} />
        <div className="contact-content">
          <motion.h1
            initial={{ opacity: 0.5, y: 30 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="contact-title py-4 text-center text-4xl font-medium tracking-tight md:text-7xl"
          >
            Get in touch
          </motion.h1>
          <div className="contact-links flex items-center space-x-6 mt-10">
            <a href={`mailto:${contact.email}`} className="contact-link" aria-label="Email"><MailIcon className="w-8 h-8" /></a>
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="LinkedIn"><LinkedinIcon className="w-8 h-8" /></a>
            {contact.customLink && contact.customLink !== "#" && (
                <a href={contact.customLink} target="_blank" rel="noopener noreferrer" className="contact-link" aria-label="GitHub"><CustomIcon className="w-8 h-8" /></a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default ContactSection;
